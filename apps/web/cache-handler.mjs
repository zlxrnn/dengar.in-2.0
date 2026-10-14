import { readFileSync } from 'node:fs';
import { createClient } from 'redis';
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import { CacheHandler } from '@fortedigital/nextjs-cache-handler';
import createLruHandler from '@fortedigital/nextjs-cache-handler/local-lru';
import createRedisHandler from '@fortedigital/nextjs-cache-handler/redis-strings';
import createCompositeHandler from '@fortedigital/nextjs-cache-handler/composite';

/**
 * Cache handler kustom Next.js — dipasang lewat `cacheHandler` di next.config.js.
 *
 * Tugasnya mengganti cache ISR/SSG bawaan Next.js (yang menulis ke folder
 * .next di disk tiap instance) dengan Redis, supaya semua instance server
 * berbagi satu cache dan hasil revalidasi langsung terlihat di semua instance.
 *
 * File ini berekstensi .mjs dan BUKAN TypeScript: Next.js memuatnya lebih awal
 * dari pipeline kompilasi, jadi tidak ada yang mentranspile TypeScript di sini.
 *
 * Referensi: https://caching-tools.github.io/next-shared-cache
 */

const LEGACY_KEY_PREFIX = 'dengarin:next:';

/**
 * Prefiks key Redis yang diberi namespace per build.
 *
 * Redis bersama hidup lebih lama daripada satu build. Tanpa namespace, HTML
 * build lama tetap dibaca (x-nextjs-cache: HIT) setelah redeploy dan menunjuk
 * ke chunk JS/CSS yang sudah tidak ada (404): seluruh situs tampil tanpa
 * style dan tidak interaktif. Menyertakan BUILD_ID membuat setiap build
 * memakai ruang key sendiri; key build lama berhenti dibaca dan dibersihkan
 * oleh TTL/eviction.
 *
 * @param {string | undefined} buildId
 * @returns {string} mis. 'dengarin:next:<BUILD_ID>:' — tanpa build id kembali
 *   ke prefiks lama 'dengarin:next:'.
 */
export function buildKeyPrefix(buildId) {
  const id = typeof buildId === 'string' ? buildId.trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) : '';
  return id ? `${LEGACY_KEY_PREFIX}${id}:` : LEGACY_KEY_PREFIX;
}

/**
 * Menentukan build id tanpa pernah melempar error.
 *
 * Urutan: `buildId` dari konteks onCreation (library membaca `.next/BUILD_ID`
 * dari serverDistDir) → `.next/BUILD_ID` di sebelah file ini → deployment id
 * dari platform (VERCEL_DEPLOYMENT_ID) → undefined.
 *
 * @param {{ buildId?: string } | undefined} context
 * @param {{ buildIdFile?: URL | string, env?: NodeJS.ProcessEnv }} [options] — untuk pengujian.
 * @returns {string | undefined}
 */
export function resolveBuildId(context, options = {}) {
  const { buildIdFile = new URL('./.next/BUILD_ID', import.meta.url), env = process.env } = options;
  const fromContext = typeof context?.buildId === 'string' ? context.buildId.trim() : '';
  if (fromContext) return fromContext;
  try {
    const fromFile = readFileSync(buildIdFile, 'utf8').trim();
    if (fromFile) return fromFile;
  } catch {
    // File tidak ada (mis. belum build) — lanjut ke fallback berikutnya.
  }
  return env.VERCEL_DEPLOYMENT_ID?.trim() || undefined;
}

CacheHandler.onCreation((context) => {
  // Scope global dipakai supaya hanya ada SATU koneksi Redis. Tanpa ini,
  // setiap pembuatan handler akan membuka socket baru.
  if (global.cacheHandlerConfig) {
    return global.cacheHandlerConfig;
  }

  // Menahan race condition: bila inisialisasi sedang berjalan, pakai promise
  // yang sama alih-alih memulai koneksi kedua.
  if (global.cacheHandlerConfigPromise) {
    return global.cacheHandlerConfigPromise;
  }

  // Saat `next dev`, pakai LRU in-memory saja supaya tidak perlu menyalakan
  // Redis hanya untuk mengedit UI.
  if (process.env.NODE_ENV === 'development') {
    return { handlers: [createLruHandler()] };
  }

  global.cacheHandlerConfigPromise = (async () => {
    let redisClient = null;

    // Saat `next build` tidak ada gunanya menyambung ke Redis — build hanya
    // menghasilkan artefak statis. Melewatinya mencegah build gagal di CI
    // yang tidak punya akses ke Redis produksi.
    if (PHASE_PRODUCTION_BUILD !== process.env.NEXT_PHASE && process.env.REDIS_URL) {
      try {
        redisClient = createClient({
          url: process.env.REDIS_URL,
          // Menjaga koneksi tetap hidup melewati idle timeout milik penyedia
          // Redis terkelola (Upstash, Redis Cloud, dll).
          pingInterval: 10_000
        });

        redisClient.on('error', (error) => {
          console.warn('[CacheHandler] Redis error:', error?.message ?? error);
          // Kosongkan cache konfigurasi supaya percobaan berikutnya
          // membangun ulang koneksi, bukan memakai client yang sudah mati.
          global.cacheHandlerConfig = null;
          global.cacheHandlerConfigPromise = null;
        });
      } catch (error) {
        console.warn('[CacheHandler] gagal membuat Redis client:', error);
      }
    }

    if (redisClient) {
      try {
        await redisClient.connect();
        console.info('[CacheHandler] Redis tersambung.');
      } catch (error) {
        console.warn('[CacheHandler] gagal menyambung ke Redis:', error);
        await redisClient
          .disconnect()
          .catch(() => console.warn('[CacheHandler] gagal menutup Redis client.'));
      }
    }

    const lruCache = createLruHandler();

    // Degradasi anggun: Redis mati berarti situs melambat, bukan mati.
    if (!redisClient?.isReady) {
      console.warn('[CacheHandler] Redis tidak siap — memakai LRU in-memory.');
      global.cacheHandlerConfigPromise = null;
      global.cacheHandlerConfig = { handlers: [lruCache] };
      return global.cacheHandlerConfig;
    }

    // Namespace per build (bug QA 14 Okt: HTML build lama menunjuk chunk 404).
    // Tidak pernah melempar: tanpa build id, prefiks lama dipakai dan dicatat.
    const buildId = resolveBuildId(context);
    if (!buildId) {
      console.warn('[CacheHandler] BUILD_ID tidak terbaca — cache halaman tidak diberi namespace per build.');
    }

    const redisCacheHandler = createRedisHandler({
      // keyPrefix sudah otomatis ditambahkan ke SEMUA key handler ini,
      // termasuk key tag bersama. Menulis prefiks lagi di sharedTagsKey
      // menghasilkan nama ganda seperti 'dengarin:next:dengarin:next:__sharedTags__'.
      client: redisClient,
      keyPrefix: buildKeyPrefix(buildId)
    });

    global.cacheHandlerConfigPromise = null;

    global.cacheHandlerConfig = {
      handlers: [
        createCompositeHandler({
          handlers: [lruCache, redisCacheHandler],
          // Entri bertag 'memory-cache' tetap lokal (indeks 0); sisanya ke
          // Redis (indeks 1). Pakai tag itu untuk data yang tidak layak
          // dibagikan antar instance.
          setStrategy: (ctx) => (ctx?.tags.includes('memory-cache') ? 0 : 1)
        })
      ]
    };

    return global.cacheHandlerConfig;
  })();

  return global.cacheHandlerConfigPromise;
});

export default CacheHandler;
