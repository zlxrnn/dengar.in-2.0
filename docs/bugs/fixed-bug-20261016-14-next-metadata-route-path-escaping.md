# BUG-20261016-14: Kegagalan Build Next.js Akibat Karakter Petik Tunggal pada Path Direktori Proyek

- **ID Tiket**: `BUG-20261016-14`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: Kritis (Critical - Memblokir `npm run build` produksi)
- **Komponen Terdampak**: `node_modules/next/dist/build/webpack/loaders/next-metadata-route-loader.js`, `apps/web/public/icon.svg`
- **Solusi Diterapkan**:
  1. Memperbaiki template string pada `next-metadata-route-loader.js` agar interpolasi path file (`JSON.stringify(resourcePath)`) tidak memutus literal string berpetik tunggal pada error handler Next.js.
  2. Menyalin `apps/web/src/app/icon.svg` ke `apps/web/public/icon.svg` agar favicon/icon disajikan langsung sebagai file statis web standar tanpa dependensi loader dinamis.

---

## 1. Gejala & Ringkasan Masalah

Saat menjalankan `npm run build` pada monorepo di mesin pengembang dengan path direktori yang mengandung tanda petik tunggal (misalnya: `/Users/shine/Documents/Shine's Personal Folder/...`), build webpack Next.js mengalami kegagalan kompilasi:

```text
Module parse failed: Unexpected token (11:82)
File was processed with these loaders:
 * ../../node_modules/next/dist/build/webpack/loaders/next-metadata-route-loader.js
|   const fileSizeInMB = buffer.byteLength / 1024 / 1024
|   if (fileSizeInMB > 8) {
>     throw new Error('File size for Open Graph image "/Users/shine/Documents/Shine's Personal Folder/.../icon.svg" exceeds 8MB. ' +
```

---

## 2. Analisis Akar Masalah (Root Cause)

1. Next.js `next-metadata-route-loader` menyusun string kode JavaScript menggunakan template literal di mana pesan error dibungkus dengan tanda petik tunggal (`'File size for ... ${JSON.stringify(resourcePath)} ...'`).
2. Ketika `resourcePath` mengandung tanda petik tunggal (`'`), string petik tunggal JavaScript terpotong di tengah jalan (`'File size for ... Shine'`), menyebabkan sisa path `s Personal Folder/...` menjadi invalid JavaScript token dan melempar error sintaks saat parsing webpack AST.

---

## 3. Langkah Pengujian & Verifikasi

1. Menjalankan `npm run build`.
2. Seluruh 34 rute statis dan dinamis berhasil dikompilasi (exit code 0):
   ```text
   ✓ Compiled successfully in 3.3s
   ✓ Generating static pages (34/34)
   ✓ Finalizing page optimization
   ```

