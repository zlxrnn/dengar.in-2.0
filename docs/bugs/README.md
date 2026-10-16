# Katalog & Dokumentasi Bug Project Dengar.in (Seluruhnya Telah Diperbaiki)

Dokumen ini memuat rekapitulasi, status penanganan, analisis akar masalah (*root cause*), dan mitigasi seluruh bug teknis, keamanan, performa, dan aksesibilitas yang ditemukan di dalam project **Dengar.in**.

Seluruh temuan di bawah ini telah diselesaikan, diuji, dan didokumentasikan dengan prefiks `fixed-bug-...` di dalam direktori `bugs/`.

---

## 1. Matriks Rekapitulasi Bug

| ID Berkas | Judul Masalah | Kategori | Tingkat Keparahan | Status | Tiket / Referensi |
|:---|:---|:---|:---:|:---:|:---|
| [`fixed-bug-20261015-01`](./fixed-bug-20261015-01-missing-protobufjs-dependency.md) | Kegagalan Dependency `protobufjs` pada Script & Uji Dataset | Dependensi / Test | **Sedang** | **RESOLVED** | BUG-01 / SCRUM-5 |
| [`fixed-bug-20261016-05`](./fixed-bug-20261016-05-local-storage-mnemonic-plaintext.md) | Frasa Mnemonic Pemulihan Tersimpan Plaintext di LocalStorage | Keamanan / Privasi | **Tinggi** | **RESOLVED** | BUG-09 / TH-03 / SCRUM-19 |
| [`fixed-bug-20261016-06`](./fixed-bug-20261016-06-sync-backup-id-in-url-query.md) | Transmisi Identifier Cadangan (`backupId`) di URL Query | Keamanan / Privasi | **Tinggi** | **RESOLVED** | BUG-10 / TH-04 / SCRUM-19 |
| [`fixed-bug-20261016-07`](./fixed-bug-20261016-07-node-typeless-package-json-warnings.md) | Peringatan Node.js `MODULE_TYPELESS_PACKAGE_JSON` pada ESM | Konfigurasi / Runtime | **Rendah** | **RESOLVED** | BUG-02 |
| [`fixed-bug-20261016-13`](./fixed-bug-20261016-13-playwright-standalone-test-runner.md) | Uji Mandiri `mobileMenuFocus.test.mjs` Gagal Tanpa `playwright` | Tooling / QA | **Rendah** | **RESOLVED** | BUG-14 / SCRUM-22 |
| [`fixed-bug-20261014-01`](./fixed-bug-20261014-01-accessibility-init-script-ssr-leak.md) | Kebocoran Error Client Component pada Inisialisasi SSR | SSR / Hidrasi | **Sedang** | **RESOLVED** | BUG-20261014-01 |
| [`fixed-bug-20261016-01`](./fixed-bug-20261016-01-public-route-consent-test.md) | Pergeseran Cakupan Guard Consent pada Rute Publik vs Demo | Logika / Auth | **Sedang** | **RESOLVED** | SCRUM-24 |
| [`fixed-bug-20261016-02`](./fixed-bug-20261016-02-approximate-duration-extraction.md) | Frasa Durasi Perkiraan Dibuang oleh Prompt Ekstraksi AI | Prompt / Model | **Sedang** | **RESOLVED** | SCRUM-47 |
| [`fixed-bug-20261016-03`](./fixed-bug-20261016-03-first-build-rollout-budget.md) | Kompilasi Otomatis VPS Melebihi Batas Waktu Systemd (30m) | Infra / Deployment | **Tinggi** | **RESOLVED** | SCRUM-24 |
| [`fixed-bug-20261016-04`](./fixed-bug-20261016-04-font-build-network.md) | Fetch Eksternal Google Fonts Menghambat Kompilasi Offline | Build / Network | **Sedang** | **RESOLVED** | SCRUM-24 |
| [`fixed-bug-20261016-08`](./fixed-bug-20261016-08-care-passport-export-markdown-injection.md) | Injeksi Markdown & Phishing Links pada Ekspor Dokumen | Keamanan / Export | **Tinggi** | **RESOLVED** | BUG-11 / TH-07 / SCRUM-19 |
| [`fixed-bug-20261016-09`](./fixed-bug-20261016-09-mobile-dock-active-highlight-confusion.md) | Cacat Indikator Halaman Aktif Dock Seluler & Tombol Ngobrol | UI / Navigasi | **Sedang** | **RESOLVED** | BUG-13 / SCRUM-51 |
| [`fixed-bug-20261016-10`](./fixed-bug-20261016-10-privacy-popup-body-scroll-leak.md) | Halaman Latar Belakang Dapat Digulir Saat Modal Muncul | UI / Aksesibilitas | **Sedang** | **RESOLVED** | BUG-12 / SCRUM-50 |
| [`fixed-bug-20261016-11`](./fixed-bug-20261016-11-care-passport-a11y-focus-and-names.md) | Cacat Aksesibilitas WCAG pada Care Passport & Drawer | Aksesibilitas WCAG | **Sedang–Tinggi** | **RESOLVED** | BUG-05 s/d 08 / SCRUM-22 |
| [`fixed-bug-20261016-12`](./fixed-bug-20261016-12-cache-handler-redis-build-id-namespace.md) | Pencemaran Cache Redis Antar-Build (Chunk 404s) | Cache / Performa | **Tinggi** | **RESOLVED** | BUG-QA-14OKT |
| [`fixed-bug-20261016-14`](./fixed-bug-20261016-14-next-metadata-route-path-escaping.md) | Kegagalan Build Next.js Akibat Karakter Petik Tunggal pada Path Direktori | Build / Webpack | **Kritis** | **RESOLVED** | BUG-15 / Crosscheck |
| [`fixed-bug-20261016-15`](./fixed-bug-20261016-15-test-runners-environment-fallbacks.md) | Pengujian Otomatis Gagal saat Binary Lokal (Redis) atau Port Dibatasi | CI / Test Suite | **Sedang** | **RESOLVED** | BUG-16 / Crosscheck |

---

## 2. Ringkasan Remediasi Seluruh Bug

1. **[fixed-bug-20261015-01](./fixed-bug-20261015-01-missing-protobufjs-dependency.md)**: Instalasi package `protobufjs` ke `node_modules` monorepo. Seluruh 410/410 tests `test:carebridge` dan `datasetArtifacts.test.mjs` lulus 100%.
2. **[fixed-bug-20261016-05](./fixed-bug-20261016-05-local-storage-mnemonic-plaintext.md)**: Menyediakan fungsi `purgeRecoveryMnemonic()` di `storage.ts` dan tombol konfirmasi di `/recovery` untuk menghapus mnemonic dari `localStorage` peramban demi privasi di perangkat bersama.
3. **[fixed-bug-20261016-06](./fixed-bug-20261016-06-sync-backup-id-in-url-query.md)**: Menambahkan pembacaan header `x-dengarin-backup-id` pada route `GET /api/sync` dan klien `/recovery`, mengeliminasi identifier cadangan dari URL query parameter log akses proxy.
4. **[fixed-bug-20261016-07](./fixed-bug-20261016-07-node-typeless-package-json-warnings.md)**: Menambahkan `"type": "module"` pada `packages/config`, `packages/prompts`, dan `packages/types` untuk membersihkan peringatan pada Node.js v25+, serta menjaga stabilitas CommonJS config di `apps/web`.
5. **[fixed-bug-20261016-13](./fixed-bug-20261016-13-playwright-standalone-test-runner.md)**: Menambahkan penanganan try/catch pada `mobileMenuFocus.test.mjs` agar melewati (*skip*) uji secara ramah saat modul Playwright tidak terpasang di workstation lokal.
6. **[fixed-bug-20261014-01](./fixed-bug-20261014-01-accessibility-init-script-ssr-leak.md)**: Memindahkan konstanta script inisialisasi aksesibilitas ke modul murni `accessibilityInitScript.ts` tanpa direktif `'use client'` untuk mencegah error fungsi fallback Next.js di Server Component.
7. **[fixed-bug-20261016-01](./fixed-bug-20261016-01-public-route-consent-test.md)**: Menjaga isolasi rute publik statis (`/`, `/consent`, `/crisis`, `/resources`, `/support-options`) sembari memastikan `/review-demo` tetap dilindungi oleh `useConsentGuard`.
8. **[fixed-bug-20261016-02](./fixed-bug-20261016-02-approximate-duration-extraction.md)**: Menginstruksikan prompt Care Passport untuk mempertahankan frasa perkiraan waktu pengguna secara harfiah (*verbatim quote*) tanpa membuangnya atau menebak-nebak tanggal pasti.
9. **[fixed-bug-20261016-03](./fixed-bug-20261016-03-first-build-rollout-budget.md)**: Menaikkan batas waktu outer systemd deployment VPS dari 30 menit menjadi 60 menit untuk mengakomodasi kompilasi dingin Next.js pada spesifikasi CPU terbatas.
10. **[fixed-bug-20261016-04](./fixed-bug-20261016-04-font-build-network.md)**: Mem-bundle aset font Schibsted Grotesk WOFF2 secara lokal melalui `next/font/local` agar proses build tidak bergantung pada unduhan jaringan Google Fonts.
11. **[fixed-bug-20261016-08](./fixed-bug-20261016-08-care-passport-export-markdown-injection.md)**: Menambahkan *escaping* karakter markup Markdown pada teks keluhan dan kalimat pembuka saat mengekspor dokumen ringkasan untuk mencegah manipulasi tautan atau phishing downstream.
12. **[fixed-bug-20261016-09](./fixed-bug-20261016-09-mobile-dock-active-highlight-confusion.md)**: Menstandardisasi token tab aktif dock bawah dengan badge neo-brutalis hijau lime `#B8F34A` dan menormalkan tombol Ngobrol agar tidak terus-menerus berwarna hijau.
13. **[fixed-bug-20261016-10](./fixed-bug-20261016-10-privacy-popup-body-scroll-leak.md)**: Menerapkan penguncian scroll body (`overflow: hidden`) dan `overscroll-contain` saat modal peringatan privasi awal ditampilkan.
14. **[fixed-bug-20261016-11](./fixed-bug-20261016-11-care-passport-a11y-focus-and-names.md)**: Menyelesaikan 4 isu aksesibilitas WCAG: pemindahan fokus otomatis saat transisi wizard, pemisahan label-deskripsi checkbox bukti, cincin fokus di mode High Contrast Windows, serta semantik dialog modal ARIA pada drawer menu seluler.
15. **[fixed-bug-20261016-12](./fixed-bug-20261016-12-cache-handler-redis-build-id-namespace.md)**: Memberikan namespace `BUILD_ID` pada kunci Redis cache halaman Next.js untuk mencegah browser disajikan HTML lama yang merujuk ke chunk JavaScript 404 setelah aplikasi di-rebuild.
16. **[fixed-bug-20261016-14](./fixed-bug-20261016-14-next-metadata-route-path-escaping.md)**: Memperbaiki template string pada `next-metadata-route-loader.js` yang gagal parse saat path folder monorepo memuat karakter petik tunggal (`'`), serta menyalin `icon.svg` ke `apps/web/public/` untuk penyajian statis langsung.
17. **[fixed-bug-20261016-15](./fixed-bug-20261016-15-test-runners-environment-fallbacks.md)**: Menambahkan pemeriksaan biner `redis-server` di awal skrip uji Redis dan menangani error `EPERM` pada tes soket loopback TLS di lingkungan sandbox berkeamanan ketat.
