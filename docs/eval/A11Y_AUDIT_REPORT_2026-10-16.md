# Audit aksesibilitas — bukti yang terverifikasi

Tanggal: 16 Oktober 2026. Task: [SCRUM-22](https://iqbaldovandraa.atlassian.net/browse/SCRUM-22).
Baseline kode: `d5c6714`. Status: **audit parsial; bukan sertifikasi WCAG penuh**.

## Ralat laporan sebelumnya

Klaim “WCAG 2.1 AA lulus 100%” dan matriks seluruh perangkat/browser sebelumnya tidak didukung oleh harness 12 unit test. Matriks tersebut belum direvalidasi dengan artefak manual pada audit ini. Riwayat laporan lama tetap tersedia di Git; hasil di bawah menggantikan kesimpulannya.

Unit test `tests/carebridge/a11yAudit.test.mjs` memeriksa warna hard-coded, paritas struktur kamus dan format telepon. Ia tidak menguji DOM, screen reader, kontras komponen yang sudah dirender, text scaling, atau browser lain.

## Bug yang direproduksi: fokus keluar dari modal

Sebelum patch, buka laci menu pada `/crisis`; fokus awal berada di tombol bantuan darurat. Shift+Tab memindahkan fokus ke luar dialog walaupun aria-modal aktif. `tests/browser/mobileMenuFocus.test.mjs` gagal pada keempat kombinasi berikut di Chromium 141.0.7390.37:

| Viewport | Bahasa | Sebelum | Sesudah |
|---|---|---|---|
| 390×844 | ID | Gagal: fokus keluar | Lulus |
| 390×844 | EN | Gagal: fokus keluar | Lulus |
| 768×844 | ID | Gagal: fokus keluar | Lulus |
| 768×844 | EN | Gagal: fokus keluar | Lulus |

Penyebab: pemindahan fokus awal dan handler Escape tersedia, tetapi tidak ada pembatasan Tab/Shift+Tab atau inert pada latar belakang.

Perbaikan: siklus Tab/Shift+Tab hanya memakai kontrol yang terlihat dan aktif; siblings pada jalur ancestor dialog dibuat inert dan nilai sebelumnya dipulihkan saat tutup/unmount. Tombol tutup disediakan di dalam dialog. Escape menutup tanpa quick exit dan mengembalikan fokus ke pemicu. Perubahan ke viewport desktop menutup modal dan memulihkan latar belakang.

## Cakupan regression test

Empat skenario memeriksa fokus awal, Shift+Tab, Tab pada batas akhir, 40 kali Tab, latar belakang inert, Escape, fokus kembali, tombol tutup, serta resize ke desktop. Pengujian memakai data/browser lokal; tidak memakai layanan krisis atau data pengguna.

Jalankan aplikasi lokal pada port 3217, kemudian:

```sh
QA_BASE_URL=http://127.0.0.1:3217 node --test tests/browser/mobileMenuFocus.test.mjs
```

Playwright diperlukan sebagai alat QA; jika diinstal di luar repo, set `PLAYWRIGHT_MODULE` ke entry modulnya dan `CHROMIUM_EXECUTABLE` ke binary Chromium. Tidak ada dependensi runtime aplikasi baru.

## Yang belum dibuktikan

Safari/Firefox, perangkat fisik, pembaca layar, forced-colors, ukuran target semua komponen, text scaling 140%, dan kepatuhan WCAG menyeluruh belum diverifikasi oleh regression test ini. Laporan tidak mengklaim semuanya lulus. Review pemilik Navbar dan Release Owner tetap diperlukan sebelum merge.

## Regresi popup privasi dan menu — audit lanjutan f6b0270

Ditemukan race pada kunjungan pertama: buka Menu sebelum timer popup 600 ms.
Drawer membuat `main` inert; popup yang berada di dalamnya ikut inert dan
konfirmasi tidak bisa menerima fokus. Empat kombinasi 390/768 px × ID/EN gagal
sebelum patch. Popup kini mengumumkan pembukaannya agar drawer ditutup dalam
update React yang sama; cleanup inert berjalan sebelum efek fokus popup.

`tests/browser/firstVisitModal.test.mjs` mengulang race secara deterministik,
tanpa menandai popup sudah ditutup. Delapan kombinasi 390/768 px × ID/EN ×
100/140% lulus: popup tidak inert, drawer ditutup, fokus masuk dan tetap di
popup, Escape tidak menjalankan quick exit, fokus kembali ke Menu, serta
scroll dan inert dipulihkan. Bersama empat tes drawer terdahulu: 12/12 lulus
pada Chromium 141.0.7390.37. Lint dan typecheck juga lulus.

Pembesaran teks di sini hanya membuktikan interaksi modal pada 140%; tidak
membuktikan seluruh halaman bebas clipping atau seluruh target memenuhi
ukuran minimum. Batasan browser/perangkat dan screen reader di atas tetap
berlaku. Jalankan kedua file dengan `QA_BASE_URL` menunjuk aplikasi lokal.
