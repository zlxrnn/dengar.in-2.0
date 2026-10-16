# BUG-20261016-07: Peringatan Node.js `MODULE_TYPELESS_PACKAGE_JSON` pada Workspace Packages

- **ID Tiket**: BUG-02 / `BUG-20261016-07`
- **Tanggal Ditemukan**: 15 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: Rendah (Low - Console Overhead / Noise)
- **Area / Pemilik**: `@iqbalscript` (Release Owner / Monorepo Config)
- **Komponen Terdampak**: `packages/config/package.json`, `packages/prompts/package.json`, `packages/types/package.json`, `apps/web/package.json`
- **Solusi Diterapkan**: Menambahkan `"type": "module"` pada keempat berkas package.json di atas, menghilangkan seluruh peringatan `MODULE_TYPELESS_PACKAGE_JSON` pada Node.js v25+.

---

## 1. Gejala & Ringkasan Masalah

Saat menjalankan script pengujian dengan Node.js versi 25+, terminal dipenuhi oleh puluhan baris peringatan repetitif:

```text
(node:90629) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///.../packages/config/src/index.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /.../packages/config/package.json.
```

Peringatan ini tidak menggagalkan fungsi aplikasi, namun menimbulkan *overhead* parsing saat bootstrap modul ES dan mengotori output log pengujian otomatis.

---

## 2. Analisis Akar Masalah (Root Cause)

1. Node.js v25+ memberlakukan deteksi ketat terhadap paket yang tidak mendefinisikan field `"type": "module"` di `package.json`-nya jika berkas di dalamnya menggunakan sintaks ESM (`import`/`export`).
2. Paket-paket lokal di monorepo (`packages/config`, `packages/prompts`, dan `apps/web`) belum memiliki deklarasi `"type": "module"`.

---

## 3. Langkah Reproduksi

Jalankan pengujian apa pun yang memuat modul dari `packages/config` atau `apps/web`:
```bash
node --experimental-strip-types tests/crypto/e2ee.test.mjs
```
Perhatikan peringatan `[MODULE_TYPELESS_PACKAGE_JSON]` yang dicetak ke stderr.

---

## 4. Solusi & Rekomendasi Perbaikan

Tambahkan `"type": "module"` pada masing-masing berkas konfigurasi berikut:
1. `packages/config/package.json`
2. `packages/prompts/package.json`
3. `apps/web/package.json`

Sesuai aturan `docs/COLLABORATION_RULES.md`, perubahan berkas `package.json` memerlukan koordinasi dengan Release Owner.

