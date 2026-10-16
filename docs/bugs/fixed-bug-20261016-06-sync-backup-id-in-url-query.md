# BUG-20261016-06: Transmisi Identifier Cadangan (`backupId`) Melalui URL Query Parameter

- **ID Tiket**: BUG-10 / `TH-04` / `SCRUM-19`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: **Tinggi (High - Telemetry / Access Log Disclosure Risk)**
- **Area / Pemilik**: `@immanueljustinn` (Safety & Privacy / Sync API)
- **Komponen Terdampak**: `apps/web/src/app/api/sync/route.ts`, `apps/web/src/app/recovery/page.tsx`, `apps/web/src/lib/api/syncAuth.ts`
- **Solusi Diterapkan**: Menambahkan helper `extractBackupId` dan header `x-dengarin-backup-id` pada `/api/sync` serta pemanggilannya di `/recovery`, mengeliminasi `backupId` dari URL query string.

---

## 1. Gejala & Ringkasan Masalah

Pada protokol sinkronisasi dan pemulihan data anonim, klien mengambil cadangan terenkripsi dari server menggunakan rute HTTP GET:

```http
GET /api/sync?backupId=a1b2c3...64hexChars HTTP/1.1
```

Meskipun nilai cadangan terenkripsi secara aman dengan AES-GCM-256 pada sisi klien dan server tidak dapat membaca kontennya, penyertaan `backupId` pada query parameter URL menimbulkan risiko pencatatan identifier sensitif pada lapisan infrastruktur perantara.

---

## 2. Analisis Akar Masalah (Root Cause)

1. **Perilaku Standar Web Server & Reverse Proxy**:
   - Web server (Nginx, Caddy, Apache), CDN (Cloudflare, Fastly), dan load balancer secara bawaan mencatat URL lengkap beserta string query (`$request_uri`) ke dalam berkas `access.log`.
2. **Korelasi Identifier**:
   - Jika `backupId` tercatat di log akses bersama alamat IP publik penyeru, hal ini dapat mengaitkan identitas jaringan dengan identifier akun anonim tertentu dalam jangka panjang.

---

## 3. Langkah Reproduksi

1. Periksa berkas implementasi `apps/web/src/app/api/sync/route.ts`:
   ```typescript
   export async function GET(request: NextRequest) {
     const backupId = request.nextUrl.searchParams.get('backupId');
     ...
   }
   ```
2. Setiap permintaan pemulihan dari peramban menghasilkan request HTTP dengan query parameter di URL.

---

## 4. Solusi & Rekomendasi Perbaikan

1. **Migrasi Pengiriman Identifier**:
   - Pindahkan `backupId` dari URL query parameter ke request header khusus (misal: `X-Dengarin-Backup-Id`) atau gunakan metode `POST /api/sync/retrieve` dengan body JSON terenkripsi.
2. **Konfigurasi Redaksi Log Proxy**:
   - Pada konfigurasi reverse proxy produksi (Nginx/Caddy), pastikan parameter query `backupId` diredaksi atau dihilangkan dari format log akses HTTP.

