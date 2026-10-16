# BUG-20261015-01: Kegagalan Dependency `protobufjs` pada Script & Uji Dataset CareBridge

- **ID Tiket**: BUG-01 / `BUG-20261015-01`
- **Tanggal Ditemukan**: 15 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: Sedang (Medium) — Memblokir pengujian agregat `npm test` & `npm run test:carebridge`
- **Area / Pemilik**: `@YanIanZ` (CareBridge Dataset & Scripts)
- **Solusi Diterapkan**: Menjalankan instalasi `protobufjs` ke dalam `node_modules` sehingga 410/410 tests `test:carebridge` lulus 100%.

---

## 1. Gejala & Ringkasan Masalah

Saat menjalankan rangkaian pengujian CareBridge (`npm run test:carebridge`) atau agregat pengujian penuh (`npm test`), suite pengujian `tests/carebridge/datasetArtifacts.test.mjs` mengalami kegagalan fatal dengan pesan kesalahan:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'protobufjs' imported from .../scripts/carebridge/datasetCodec.mjs
code: 'ERR_MODULE_NOT_FOUND'
```

Hal ini menyebabkan exit code `1` pada pengujian `npm test`, meskipun 403 pengujian lainnya di dalam test suite CareBridge berhasil (pass).

---

## 2. Analisis Akar Masalah (Root Cause)

1. **Impor Modul Eksternal Tanpa Sinkronisasi `node_modules`**:
   - Berkas `scripts/carebridge/datasetCodec.mjs` mengimpor `protobufjs` untuk meng-encode dan men-decode artefak Protobuf + zstd (`.pb.zst`) dari dataset kartu *self-help*.
   - Pada commit `0d99ffc`, entri `"protobufjs": "^8.8.1"` telah ditambahkan ke dalam `"devDependencies"` pada `package.json` root.
   - Namun, direktori lokal `node_modules/` belum disinkronkan via instalasi paket terbaru (`node_modules/protobufjs` tidak ditemukan di disk lokal).

---

## 3. Langkah Reproduksi

Jalankan perintah berikut pada terminal:
```bash
node --experimental-strip-types tests/carebridge/datasetArtifacts.test.mjs
```

**Hasil Teramati:**
Error `ERR_MODULE_NOT_FOUND` dilempar oleh loader Node.js saat mencoba me-resolve `'protobufjs'`.

---

## 4. Solusi & Rekomendasi Perbaikan

1. Jalankan sinkronisasi dependensi di root monorepo:
   ```bash
   npm install
   ```
2. Pastikan folder `node_modules/protobufjs` terbentuk dan dapat diimpor.
3. Jalankan kembali pengujian:
   ```bash
   node --experimental-strip-types tests/carebridge/datasetArtifacts.test.mjs
   ```
4. Pastikan `npm run test:carebridge` lulus 100% (404/404 pass).

