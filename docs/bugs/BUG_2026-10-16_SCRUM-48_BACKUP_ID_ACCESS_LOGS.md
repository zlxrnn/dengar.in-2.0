# Bug Report: Sensitive Backup Identifier (`backupId`) Leaked via HTTP GET Query Parameters in Web Server Access Logs

- **ID Tiket**: BUG-10 / `SCRUM-48`
- **Tanggal**: 16 Oktober 2026
- **Tingkat Keparahan**: **Tinggi (High)**
- **Epic Jira**: `SCRUM-8 Privacy`
- **Penanggung Jawab**: Justin
- **Komponen Terdampak**:
  - `apps/web/src/app/recovery/page.tsx` (baris 134)
  - `apps/web/src/app/api/sync/route.ts`
- **Domain Keamanan**: Domain 3: Server Logs & Operational Telemetry
- **Kebijakan Data**: **100% Data Sintetis (Zero Production User Data)**

---

## 1. Ringkasan Masalah
Pada alur sinkronisasi data cadangan awan di halaman `/recovery`, klien melakukan pemeriksaan data cadangan menggunakan metode `HTTP GET` dengan menyematkan `backupId` pada parameter kueri URL:
```typescript
const existing = await fetch(`/api/sync?backupId=${encodeURIComponent(backupId)}`, { cache: 'no-store' });
```
Server web (Nginx, Apache), reverse proxy Docker, CDN (Cloudflare), dan riwayat navigasi peramban mencatat seluruh string URL termasuk parameter kueri ke dalam berkas log akses (`access.log`).

---

## 2. Analisis Dampak & Skenario Ancaman
- **Pelanggaran Prinsip Zero-PII Logging**: Meskipun isi data cadangan terenkripsi *end-to-end* (AES-GCM-256), keberadaan `backupId` pada log akses server mengaitkan alamat IP publik pengguna dengan akun cadangan secara persisten.
- **Pengawasan dan Profiling Pihak Ketiga**: Pihak yang memiliki akses log server infrastruktur dapat melacak frekuensi dan waktu aktivitas pengguna tertentu.

---

## 3. Langkah Reproduksi (Menggunakan Data Sintetis)
1. Eksekusi permintaan HTTP GET sintetis:
   ```bash
   curl -I "http://localhost:3000/api/sync?backupId=mock_sync_id_synthetic_01928374"
   ```
2. Periksa berkas log akses reverse proxy / web server:
   ```text
   [16/Oct/2026:12:00:00 +0700] "GET /api/sync?backupId=mock_sync_id_synthetic_01928374 HTTP/1.1" 200 452 "-" "Mozilla/5.0"
   ```
3. Teridentifikasi bahwa `backupId` tercatat secara gamblang di catatan akses server.

---

## 4. Rekomendasi Remediasi
1. Pindahkan `backupId` dari parameter kueri URL ke *HTTP Header* kustom (`X-Backup-ID`) atau gunakan metode `POST` dengan *body* JSON terbatas.
2. Pastikan reverse proxy tidak mencatat parameter kueri untuk rute `/api/sync`.

