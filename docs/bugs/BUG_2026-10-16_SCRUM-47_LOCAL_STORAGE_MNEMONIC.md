# Bug Report: Plaintext Storage of Master Recovery Mnemonic & Unencrypted Health Records in Browser `localStorage`

- **ID Tiket**: BUG-09 / `SCRUM-47`
- **Tanggal**: 16 Oktober 2026
- **Tingkat Keparahan**: **Tinggi (High)**
- **Epic Jira**: `SCRUM-8 Privacy`
- **Penanggung Jawab**: Immanuel Justin Elnathan
- **Komponen Terdampak**:
  - `apps/web/src/lib/storage.ts` (fungsi `initAnonymousSession`, `saveAnonymousSession`)
  - `apps/web/src/app/recovery/page.tsx`
- **Domain Keamanan**: Domain 2: Local Storage & Client Secrets
- **Kebijakan Data**: **100% Data Sintetis (Zero Production User Data)**

---

## 1. Ringkasan Masalah
Pada implementasi penyimpanan lokal peramban (`localStorage`), Dengar.in membangkitkan 12 kata mnemonik pemulihan akun anonim (`recoveryMnemonic`) dan menyimpannya secara mentah (*plaintext*) di kunci `dengarin_anonymous_session`. 

Mnemonik ini bertindak sebagai *master cryptographic key* yang dipakai oleh Web Crypto API untuk menurunkan:
1. Kunci simetris AES-GCM-256 (`encryptSessionData` / `decryptSessionData`).
2. Kredensial bukti tulis cadangan awan (`writeKey`) pada endpoint `/api/sync`.

Selain itu, catatan refleksi sensitif pengguna (`dengarin_journal_entries`, `dengarin_checkins`, `dengarin_weekly_reflection_*`) disimpan dalam bentuk objek JSON *plaintext* tanpa proteksi kriptografis di tingkat peramban.

---

## 2. Analisis Dampak & Skenario Ancaman
- **Akses Fisik / Komputer Bersama (*Shared Workstation Risk*)**: Pengguna yang mengakses Dengar.in melalui komputer kampus, warnet, atau gawai pinjaman berisiko mengalami kebocoran data jika tidak melakukan pembersihan riwayat browser secara manual.
- **Pencurian Kunci Master**: Pengguna berikutnya hanya perlu membuka *DevTools Console* (`localStorage.getItem('dengarin_anonymous_session')`) untuk mendapatkan mnemonik dan mencuri seluruh rekaman data curhat yang tersinkronisasi di server `/api/sync`.

---

## 3. Langkah Reproduksi (Menggunakan Data Sintetis)
1. Buka peramban pada `http://localhost:3000/recovery`.
2. Buka DevTools Console (`F12`), jalankan:
   ```javascript
   // Data Uji Sintetis:
   const data = JSON.parse(localStorage.getItem('dengarin_anonymous_session'));
   console.log('Mnemonik Pemulihan Mentah:', data.recoveryMnemonic);
   // Contoh Nilai Sintetis: "abandon ability able about above absent absorb abstract absurd abuse access accident"
   ```
3. Terbukti bahwa kunci master tersimpan tanpa enkripsi lokal maupun mekanisme penguncian sesi otomatis (*session timeout*).

---

## 4. Rekomendasi Remediasi
1. Berikan tombol *"Hapus Mnemonik dari Perangkat Ini"* setelah pengguna mencatat frasa secara manual.
2. Tambahkan peringatan keamanan mencolok (*shared device notice*) di `/recovery` dan opsi untuk mengunci catatan lokal dengan kata sandi lokal (*local PIN/passphrase*) jika menggunakan komputer umum.

