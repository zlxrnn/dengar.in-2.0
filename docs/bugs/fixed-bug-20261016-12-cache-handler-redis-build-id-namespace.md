# BUG-20261016-12: Pencemaran Cache Redis Antar-Build (Stale Chunk 404s Setelah Rebuild)

- **ID Tiket**: BUG-QA-14OKT / `SCRUM-12`
- **Tanggal Ditemukan**: 14 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tingkat Keparahan**: **Tinggi (High - Production Outage / Chunk Load Failure)**
- **Komponen Terdampak**: `apps/web/cache-handler.mjs`, `tests/infra/cacheHandlerBuildId.test.mjs`
- **Solusi Diterapkan**: Menambahkan namespace `BUILD_ID` pada semua key halaman Next.js di Redis.

---

## 1. Gejala & Ringkasan Masalah

Pada arsitektur multi-instance produksi dengan shared Redis cache, setelah VPS melakukan rebuild aplikasi, pengguna yang mengakses halaman publik (seperti `/resources`) menerima respons HTML basi (*stale HTML*) dari build sebelumnya yang tersimpan di Redis.

HTML lama tersebut menunjuk ke berkas JavaScript chunk Webpack (`/_next/static/chunks/[hash].js`) yang sudah tidak ada di disk container baru, menghasilkan galat `404 Not Found` pada chunk assets dan kegagalan total hidrasi halaman di sisi klien.

---

## 2. Analisis Akar Masalah (Root Cause)

1. Handler cache Next.js (`cache-handler.mjs`) menyimpan entri halaman menggunakan prefix seragam:
   `dengarin:next:/resources`
2. Kunci ini tidak memuat pengenal versi build (`BUILD_ID`). Saat container aplikasi baru menyala dan tersambung ke Redis, ia membaca cache lama dari container sebelumnya karena kunci Redis belum kedaluwarsa (TTL belum habis).

---

## 3. Solusi & Remediasi yang Diterapkan

1. **Namespace Berbasis BUILD_ID**:
   - Memodifikasi `apps/web/cache-handler.mjs` untuk membaca `.next/BUILD_ID` saat inisialisasi handler.
   - Format kunci Redis diubah menjadi:
     `dengarin:next:${buildId}:${path}` (misal: `dengarin:next:b1234abcd:/resources`).
2. **Graceful Fallback**:
   - Jika `BUILD_ID` tidak dapat dibaca, handler jatuh ke prefiks bawaan tanpa melempar error.
3. **Uji Regresi Otomatis**:
   - Ditambahkan berkas pengujian `tests/infra/cacheHandlerBuildId.test.mjs` (8/8 pass) yang memastikan:
     - Dua build id berbeda menghasilkan prefiks berbeda di Redis.
     - Kunci dibersihkan dari whitespace / newline.
     - Instance aplikasi baru tidak pernah membaca entri HTML dari build sebelumnya.

