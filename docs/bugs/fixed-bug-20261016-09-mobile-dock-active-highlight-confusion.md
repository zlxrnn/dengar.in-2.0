# BUG-20261016-09: Cacat Indikator Halaman Aktif pada Dock Seluler & Tombol Ngobrol Selalu Hijau

- **ID Tiket**: BUG-13 / `SCRUM-51`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tingkat Keparahan**: Sedang (Medium - UI / UX Navigation Confusion)
- **Komponen Terdampak**: `apps/web/src/components/Navbar.tsx`
- **Solusi Diterapkan**: Standardisasi badge neo-brutalis hijau lime `#B8F34A` dan helper `isRouteActive`.

---

## 1. Gejala & Ringkasan Masalah

Pada navigasi dock bawah di layar ponsel (lebar layar $\le 768\text{px}$):
1. **Highlight Tab Aktif Sangat Samar**: Tab yang aktif hanya ditandai dengan garis biru 3px tipis di tepi atas, yang hampir tidak terlihat di bawah sinar matahari atau layar redup.
2. **Tombol Tengah "Ngobrol" Selalu Hijau di Semua Halaman**: Tombol `NgobrolDockButton` selalu diwarnai hijau lime (`bg-[#B8F34A]/70`), mencuri perhatian visual dan memberikan ilusi palsu bahwa pengguna sedang berada di halaman Ngobrol/Chat pada setiap saat.
3. **Ketiadaan Indikator untuk Halaman Sub-Menu**: Membuka rute seperti `/journal`, `/forum`, atau `/report` dari menu drawer menyebabkan dock bawah berstatus pasif tanpa penanda aktif.

---

## 2. Analisis Akar Masalah (Root Cause)

1. Inkonsistensi token desain antara desktop (hijau lime neo-brutalis) dan mobile dock (garis biru tipis eksperimental).
2. Hardcoded styling hijau mencolok pada tombol aksi tengah.
3. Pencocokan rute menggunakan kesetaraan kaku (`pathname === href`) yang gagal mendeteksi sub-halaman bertingkat.

---

## 3. Solusi & Remediasi yang Diterapkan

1. Implementasi helper `isRouteActive` di `Navbar.tsx` yang mendukung pencocokan awalan sub-rute (`pathname.startsWith(href + '/')`).
2. Tab aktif di dock bawah kini menggunakan badge neo-brutalis resmi:
   `bg-[#B8F34A] text-[#151515] border-[#151515] shadow-[2px_2px_0px_#151515] font-bold` (kontras 12.6:1, lulus WCAG AAA).
3. Tombol "Ngobrol" dinormalisasi: hanya menyala hijau saat rute chat (`/chat`, `/ruang-ngobrol`) aktif.
4. Tombol "Menu" menyala hijau jika pengguna berada di rute turunan yang bersumber dari menu drawer.

