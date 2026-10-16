# BUG-20261016-13: Eksekusi Mandiri Uji Browser Seluler Gagal Akibat Modul `playwright` Tidak Terpasang

- **ID Tiket**: BUG-14 / `SCRUM-22`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: Rendah (Low - Di luar cakupan `npm test` utama)
- **Komponen Terdampak**: `tests/browser/mobileMenuFocus.test.mjs`
- **Solusi Diterapkan**: Menambahkan penanganan try/catch pada impor dinamis Playwright, sehingga uji melewati (*skip*) eksekusi secara ramah tanpa crash ketika modul Playwright tidak terpasang di lokal.

---

## 1. Gejala & Ringkasan Masalah

Saat seorang developer mencoba menjalankan uji end-to-end fokus menu seluler secara langsung:

```bash
node --experimental-strip-types tests/browser/mobileMenuFocus.test.mjs
```

Node.js melempar galat fatal:
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'playwright' imported from .../tests/browser/mobileMenuFocus.test.mjs
```

Test suite ini sengaja tidak dimasukkan ke dalam `package.json` `"test"` agregat, namun pengguna atau QA engineer yang menjalankan tes spesifik ini secara terpisah akan mengalami kegagalan impor.

---

## 2. Analisis Akar Masalah (Root Cause)

1. Pada baris 5 berkas `tests/browser/mobileMenuFocus.test.mjs`:
   ```javascript
   const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
   ```
2. Modul `playwright` dirancang untuk diimpor secara dinamis dari instalasi QA eksternal melalui variabel `PLAYWRIGHT_MODULE`.
3. Namun paket `playwright` tidak tercantum di `devDependencies` `package.json` root maupun workspace, sehingga pemanggilan tanpa variabel environment selalu gagal.

---

## 3. Solusi & Rekomendasi Perbaikan

1. Tambahkan `playwright` sebagai `devDependencies` opsional di root jika ingin didukung langsung di workstation lokal:
   ```bash
   npm i -D playwright
   ```
2. Atau tambahkan guard pengecekan keberadaan modul sebelum eksekusi uji dimulai, dan tampilkan pesan instruksi skip yang ramah:
   ```javascript
   let chromium;
   try {
     ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright'));
   } catch {
     console.warn('Lewati uji browser: modul playwright belum terinstall di environment ini.');
     process.exit(0);
   }
   ```

