# Laporan Penemuan Bug Keamanan & Model Ancaman (CareBridge Track 2)

Tanggal: 16 Oktober 2026  
Status Audit: Hasil evaluasi pengujian model ancaman (*threat modeling*) dan suite pengujian penyalahgunaan (*abuse checks*)  
Terkait Dokumen: [`docs/THREAT_MODEL.md`](../THREAT_MODEL.md) & [`tests/security/abuseChecks.test.mjs`](../../tests/security/abuseChecks.test.mjs)  
Kebijakan Privasi Data: **100% Data Pengguna Sintetis (Zero Production User Data Shared)**

Dokumen ini mencatat temuan bug keamanan berstatus *Critical* / *High* yang ditemukan selama pelaksanaan audit keamanan 7 domain (Prompts, Local Storage, Server Logs, Keys, Forum Abuse, Export, Provider Disclosure). Setiap temuan dihubungkan langsung ke tiket Jira backlog proyek.

---

## 1. [BUG-09 / SCRUM-47] Plaintext Storage of Master Recovery Mnemonic & Unencrypted Health Records in Browser `localStorage`

- **Tingkat Keparahan**: **Tinggi (High)** — Pelanggaran Prinsip Kerahasiaan Rekam Medis / Akses Fisik Tidak Terotorisasi
- **Jira Key / Epic**: `SCRUM-47` (Epic `SCRUM-8 Privacy`, Penanggung Jawab: Immanuel Justin Elnathan)
- **Komponen Terdampak**:
  - `apps/web/src/lib/storage.ts`
  - `apps/web/src/app/recovery/page.tsx`
- **Domain Ancaman**: Domain 2: Local Storage & Client Secrets

### Deskripsi Masalah:
Sesi pengguna anonim (`initAnonymousSession`) membangkitkan 12 kata mnemonik pemulihan (`recoveryMnemonic`) dan menyimpannya secara mentah (*plaintext*) ke dalam `localStorage` pada kunci `dengarin_anonymous_session`. 
Mnemonik ini merupakan *kunci master kriptografi* yang digunakan oleh Web Crypto API untuk menurunkan kunci enkripsi AES-GCM-256 (`encryptSessionData`) dan token bukti kepemilikan tulis (`writeKey`) untuk sinkronisasi cadangan *cloud* pada `/api/sync`.

Selain itu, catatan refleksi sensitif (`dengarin_journal_entries`, `dengarin_checkins`, `dengarin_weekly_reflection_*`) disimpan dalam bentuk JSON mentah tanpa proteksi enkripsi lokal tingkat peramban.

### Skenario Ancaman & Dampak:
Jika pengguna mengakses Dengar.in melalui perangkat publik atau perangkat bersama (laboratorium kampus, komputer perpustakaan, kafe internet/warnet, atau laptop pinjaman):
1. Siapa pun yang membuka peramban setelahnya dapat membuka *DevTools Console* atau memeriksa berkas profil peramban lokal untuk menyalin 12 kata mnemonik pemulihan secara utuh.
2. Pelaku kemudian dapat memulihkan seluruh riwayat jurnal pribadi dan *check-in* pengguna dari titik akhir `/api/sync` di perangkat lain.

### Langkah Reproduksi (Menggunakan Data Sintetis 100%):
1. Buka peramban dan jalankan aplikasi secara lokal (`http://localhost:3000`).
2. Masuk ke halaman `/recovery`.
3. Buka Console DevTools dan jalankan skrip pembuktian konsep sintetis berikut:
   ```javascript
   // Data Sintetis Uji Coba:
   const session = JSON.parse(localStorage.getItem('dengarin_anonymous_session'));
   console.log('Mnemonic Master Bocor:', session.recoveryMnemonic);
   // Output: "abandon ability able about above absent absorb abstract absurd abuse access accident"
   ```
4. Verifikasi bahwa mnemonik tersimpan secara permanen tanpa batas kedaluwarsa (*expiry*) dan tanpa proteksi kata sandi tambahan.

### Rekomendasi Remediasi:
1. **Opsi Penghapusan Mnemonik dari Perangkat (*Mnemonic Purge*)**: Berikan tombol tindakan afirmatif bagi pengguna: *"Saya sudah mencatat 12 kata ini, hapus frasa dari peramban ini"*.
2. **Kunci Sesi Otomatis (*Session Lock*)**: Terapkan enkripsi lokal sederhana dengan passphrase sementara pengguna jika menggunakan perangkat bersama, atau peringatan keamanan mencolok saat membuka halaman `/recovery` di komputer publik.

---

## 2. [BUG-10 / SCRUM-48] Sensitive Backup Identifier (`backupId`) Leaked via HTTP GET Query Parameters in Web Server Access Logs

- **Tingkat Keparahan**: **Tinggi (High)** — Kebocoran Pengidentifikasi Persisten pada Log Server Akses
- **Jira Key / Epic**: `SCRUM-48` (Epic `SCRUM-8 Privacy`, Penanggung Jawab: Immanuel Justin Elnathan)
- **Komponen Terdampak**:
  - `apps/web/src/app/recovery/page.tsx` (baris 134)
  - `apps/web/src/app/api/sync/route.ts`
- **Domain Ancaman**: Domain 3: Server Logs & Operational Telemetry

### Deskripsi Masalah:
Saat melakukan pemeriksaan cadangan awan, klien melakukan pemanggilan HTTP GET ke rute sinkronisasi menggunakan parameter kueri URL:
```typescript
const existing = await fetch(`/api/sync?backupId=${encodeURIComponent(backupId)}`, { cache: 'no-store' });
```
Nilai `backupId` adalah hash persisten dari kredensial sinkronisasi pengguna. Server web standar (Nginx, Caddy, Apache), penyedia komputasi awan, CDN (Cloudflare), dan *proxy* pencatat log secara bawaan menyimpan URL lengkap beserta seluruh string kueri (*query parameters*) ke dalam berkas `access.log`.

### Skenario Ancaman & Dampak:
1. **Pelanggaran Prinsip Zero-PII Logging**: Log server akses web produksi akan menghimpun daftar `backupId` yang terkait langsung dengan alamat IP klien asal pada stempel waktu tertentu.
2. Pengamat log atau pihak ketiga dengan akses ke log infrastruktur dapat memetakan pola waktu pencadangan pengguna tertentu dan menguji keberadaan akun/data tanpa melewati mekanisme autentikasi.

### Langkah Reproduksi (Menggunakan Data Sintetis 100%):
1. Jalankan pengujian HTTP GET sintetis:
   ```bash
   curl -I "http://localhost:3000/api/sync?backupId=mock_sync_id_synthetic_01928374"
   ```
2. Periksa berkas log akses perantara (reverse proxy / container output):
   ```text
   [16/Oct/2026:12:00:00 +0700] "GET /api/sync?backupId=mock_sync_id_synthetic_01928374 HTTP/1.1" 200 452 "-" "Mozilla/5.0"
   ```
3. Terlihat bahwa pengidentifikasi unik cadangan tercetak secara eksplisit pada log server.

### Rekomendasi Remediasi:
1. Pindahkan `backupId` dari parameter kueri URL ke *HTTP Request Header* kustom, misalnya `X-Backup-ID`, atau gunakan metode `POST` dengan badan permintaan (*request body*) JSON terenkripsi/terbatas.
2. Pastikan konfigurasi reverse proxy (Nginx) memfilter parameter kueri sensitif jika metode GET tetap digunakan.

---

## 3. [BUG-11 / SCRUM-49] Unsanitized Markdown Hyperlink Injection in Exported Care Passport Documents

- **Tingkat Keparahan**: **Tinggi (High)** — Manipulasi Format Dokumen Ekspor / Risiko Phishing Klinis
- **Jira Key / Epic**: `SCRUM-49` (Epic `SCRUM-5 CareBridge`, Penanggung Jawab: I Wayan Bagus Arya Darma Wiguna)
- **Komponen Terdampak**:
  - `apps/web/src/lib/carePassportExport.ts`
- **Domain Ancaman**: Domain 6: Export & Downstream Ingestion

### Deskripsi Masalah:
Fungsi `buildCarePassportExport` mengekspor poin-poin kekhawatiran (*concerns*) dan dampak harian (*daily impact*) ke dalam format Markdown (`.md`) dengan menyematkan nilai mentah secara langsung ke dalam baris daftar:
```typescript
const bullet = (value: string) => (md ? `- ${value}` : `- ${value}`);
```
Jika cerita pengguna memuat sintaks tautan Markdown (misalnya `[Klinik Jiwa Harapan](https://phishing-domain.invalid/login)`), generator ekspor tidak menetralkan tanda kurung kurawal maupun tanda kurung Markdown.

### Skenario Ancaman & Dampak:
1. **Phishing / Spoofing Layanan Kesehatan**: Pengguna yang menyalin teks rekomendasi palsu dari forum atau penyerang yang memasukkan cerita injeksi dapat menghasilkan dokumen ekspor Care Passport resmi bertanda tangan digital yang memuat tautan berbahaya yang dapat diklik (*live clickable hyperlinks*).
2. Ketika dokumen Markdown ini diunggah atau dilihat oleh konselor/tenaga profesional di aplikasi penampil Markdown atau portal klinik, tautan tersebut dapat mengelabui staf medis atau pengguna menuju situs berbahaya.

### Langkah Reproduksi (Menggunakan Data Sintetis 100%):
1. Buat paspor terverifikasi dengan nilai input sintetis:
   ```javascript
   const passport = {
     version: 1,
     reviewStatus: 'user_approved',
     concerns: [{ value: 'Saya disarankan mengunjungi [Portal Resmi](https://phishing-scam.invalid)', source: 'user_input' }],
     dailyImpact: [],
     duration: { value: null, source: 'unknown' },
     relevantContext: [],
     questionsForProfessional: [],
     unknowns: [],
     disclaimer: 'Disclaimer medis'
   };
   const md = buildCarePassportExport(passport, { format: 'md' });
   console.log(md);
   ```
2. Verifikasi hasil ekspor:
   ```markdown
   ## KEKHAWATIRAN UTAMA
   - Saya disarankan mengunjungi [Portal Resmi](https://phishing-scam.invalid)
   ```
3. Format tautan Markdown tetap hidup dan aktif, bukan teks statis netral.

### Rekomendasi Remediasi:
1. Terapkan fungsi pembersihan karakter format Markdown (*Markdown escaping*) pada `presentValues()` di `carePassportExport.ts`.
2. Gantikan karakter `[` dan `]` dengan entitas karakter atau netralkan sintaks URL sebelum merender berkas `.md`.

