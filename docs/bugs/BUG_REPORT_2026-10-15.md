# Laporan Penemuan Bug & Temuan Teknis (CareBridge Track 2)

Tanggal: 15 Oktober 2026  
Status Audit: Hasil evaluasi pengujian otomatis dan analisis dependensi

Dokumen ini mencatat temuan bug, inkonsistensi dependensi, dan peringatan teknis yang ditemukan selama pengerjaan dan pengujian fitur CareBridge.

---

## 1. [BUG-01] Missing Dependency `protobufjs` pada Script Dataset

- **Tingkat Keparahan**: Sedang (Non-blocking untuk runtime web, blocking untuk test dataset build)
- **Lokasi Berkas**:
  - `scripts/carebridge/datasetCodec.mjs`
  - `tests/carebridge/datasetArtifacts.test.mjs`
  - `package.json` (baris 71)
- **Gejala / Error**:
  Saat menjalankan `npm run test:carebridge`, suite pengujian `datasetArtifacts.test.mjs` mengalami kegagalan:
  ```text
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'protobufjs' imported from .../scripts/carebridge/datasetCodec.mjs
  code: 'ERR_MODULE_NOT_FOUND'
  ```
- **Penyebab**:
  Dependensi `"protobufjs": "^8.8.1"` sudah tercantum di `package.json` root, tetapi `node_modules` lokal belum diperbarui via instalasi npm workspace terbaru atau package belum terpasang di folder workspace yang sesuai.
- **Rekomendasi Perbaikan**:
  Jalankan `npm install` di root repository untuk mengunduh dan menyinkronkan binari `protobufjs`.

---

## 2. [BUG-02] Peringatan Node.js: `MODULE_TYPELESS_PACKAGE_JSON`

- **Tingkat Keparahan**: Rendah (Warning / Log overhead, tidak merusak fungsionalitas)
- **Lokasi Berkas**:
  - `packages/config/package.json`
  - `packages/prompts/package.json`
  - `apps/web/package.json`
- **Gejala / Warning**:
  ```text
  (node:...) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///.../packages/config/src/supportOptions.ts is not specified and it doesn't parse as CommonJS.
  Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
  To eliminate this warning, add "type": "module" to .../package.json.
  ```
- **Penyebab**:
  Node.js v25+ mendeteksi sintaks ESM (`import`/`export`) di dalam paket tanpa deklarasi `"type": "module"` eksplisit di `package.json` masing-masing workspace, sehingga Node melakukan reparsing dengan overhead performa kecil.
- **Rekomendasi Perbaikan**:
  Tambahkan field `"type": "module"` pada `packages/config/package.json` dan `packages/prompts/package.json`.

---

## 3. [BUG-03] Stale Documentation References untuk Halaman Baru

- **Tingkat Keparahan**: Dokumentasi / Sinkronisasi Status
- **Lokasi Berkas**:
  - `docs/DEMO_SCRIPT.md` (baris 5)
  - `docs/SUBMISSION_COPY.md` (baris 9 & 76)
- **Gejala**:
  Dokumen skrip demo dan catatan submission masih mencantumkan teks lama bertanggal 14 Oktober 2026 yang menyatakan:
  > *"halaman `/support-options` dan `/review-demo` belum ada"*
  Padahal per 15 Oktober 2026, kedua halaman ini sudah selesai diimplementasikan, memiliki unit test lengkap, dan aktif pada router Next.js.
- **Rekomendasi Perbaikan**:
  Perbarui status kedua dokumen tersebut agar selaras dengan `AMD_TRACK2_TASKS.md` bahwa AMD-12 telah berstatus Selesai.

---

## 4. [BUG-04] Ketersediaan Domain Eksternal Layanan KPAI

- **Tingkat Keparahan**: Sumber Eksternal / Pihak Ketiga
- **Lokasi Berkas**:
  - `packages/config/src/index.ts` (entri `kpai-pengaduan`)
- **Gejala**:
  Saat verifikasi integritas sumber eksternal, domain `kpai.go.id` terdeteksi sering mengalami maintenance (HTTP 521) dan nomor WhatsApp belum terverifikasi secara resmi di kanal pemerintah.
- **Status Penanganan**:
  Pada modul baru `packages/config/src/supportOptions.ts`, entri KPAI sengaja **tidak dimasukkan** ke dalam daftar opsi bantuan terverifikasi sampai ada konfirmasi kanal resmi yang aktif dan stabil, sehingga mencegah pengguna diarahkan ke situs yang *down*.

