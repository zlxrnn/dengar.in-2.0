# BUG-20261016-05: Frasa Mnemonic Pemulihan Tersimpan Plaintext di LocalStorage Browser

- **ID Tiket**: BUG-09 / `TH-03` / `SCRUM-19`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: **Tinggi (High - Information Disclosure / Shared Device Risk)**
- **Area / Pemilik**: `@immanueljustinn` (Safety & Privacy / Storage)
- **Komponen Terdampak**: `apps/web/src/lib/storage.ts`, `apps/web/src/app/recovery/page.tsx`
- **Solusi Diterapkan**: Menambahkan helper `purgeRecoveryMnemonic()` dan tombol/konfirmasi UI di `/recovery` untuk menghapus mnemonic dari `localStorage` secara aman bagi pengguna perangkat bersama.

---

## 1. Gejala & Ringkasan Masalah

Pada aplikasi Dengar.in, sesi anonim pengguna menginisialisasi 12-kata frasa mnemonic pemulihan (*recovery mnemonic*) yang menjadi dasar pembentukan kunci enkripsi AES-GCM-256 dan token kepemilikan cadangan cloud (`/api/sync`).

Fungsi `initAnonymousSession()` dan `saveAnonymousSession()` menyimpan seluruh objek sesi termasuk frasa `recoveryMnemonic` langsung ke dalam `localStorage` peramban di bawah kunci `dengarin_anonymous_session`:

```json
{
  "userId": "anon_...",
  "currentDay": 1,
  "recoveryMnemonic": "word1 word2 word3 ... word12"
}
```

Pengujian baseline keamanan pada `tests/security/abuseChecks.test.mjs` membuktikan bahwa string mnemonic ini dapat dibaca secara langsung tanpa proteksi apa pun oleh siapa saja yang memiliki akses fisik atau profil peramban yang sama.

---

## 2. Analisis Akar Masalah (Root Cause)

1. **Ketiadaan Enkripsi / Penguncian Sesi Klien**:
   - Mnemonic disimpan dalam format string teks mentah (*plaintext*) di `localStorage` demi kemudahan pengguna saat melihat kembali frasa pemulihan di `/recovery`.
2. **Risiko Perangkat Bersama (Shared Device Threat)**:
   - Pengguna di lingkungan warnet, laboratorium kampus, atau perangkat keluarga yang lupa melakukan *"Hapus Semua Data"* meninggalkan kredensial pemulihan yang memungkinkan pihak ketiga membaca catatan dan mendekripsi cadangan di server.

---

## 3. Langkah Reproduksi

1. Buka konsol DevTools pada peramban setelah mengakses aplikasi:
   ```javascript
   JSON.parse(localStorage.getItem('dengarin_anonymous_session')).recoveryMnemonic
   ```
2. Nilai 12 kata mnemonic langsung ditampilkan dalam teks biasa.
3. Terverifikasi pada unit test:
   ```bash
   node --experimental-strip-types --test tests/security/abuseChecks.test.mjs
   ```

---

## 4. Solusi & Rekomendasi Perbaikan

1. **Pilihan Purge Mnemonic Setelah Disimpan**: Berikan opsi eksplisit kepada pengguna untuk *"Hapus frasa dari perangkat ini"* setelah mereka mencatat mnemonic secara fisik.
2. **Auto-Lock / Session Storage**: Pindahkan penyimpanan mnemonic aktif ke `sessionStorage` atau lakukan derivasi kunci di memori tanpa persistensi permanen di `localStorage`.
3. **Konfirmasi Edukatif**: Berikan peringatan risiko perangkat bersama pada halaman `/recovery`.

