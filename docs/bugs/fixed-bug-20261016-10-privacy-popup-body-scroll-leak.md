# BUG-20261016-10: Halaman Latar Belakang Dapat Digulir Saat Modal Peringatan Privasi Muncul

- **ID Tiket**: BUG-12 / `SCRUM-50`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tingkat Keparahan**: Sedang (Medium - UI / UX Disorientation & Accessibility)
- **Komponen Terdampak**: `apps/web/src/components/ui/PrivacyWarningPopup.tsx`
- **Solusi Diterapkan**: Body scroll lock dengan kompensasi scrollbar dan `overscroll-contain`.

---

## 1. Gejala & Ringkasan Masalah

Pada kunjungan pertama ke situs Dengar.in, komponen `PrivacyWarningPopup` muncul setelah jeda 600ms dengan overlay latar belakang gelap (`bg-[#151515]/60`). Modal ini mengingatkan pengguna untuk tidak membagikan identitas asli atau informasi rahasia.

Namun, terdapat cacat fungsional di mana pengguna masih dapat menggulir (*scroll*) seluruh konten landing page di belakang overlay modal menggunakan roda mouse, gesture usap layar sentuh, atau tombol navigasi keyboard. Hal ini melanggar hierarki modal dialog menurut standar aksesibilitas WAI-ARIA `alertdialog` / `aria-modal="true"`.

---

## 2. Analisis Akar Masalah (Root Cause)

1. Tidak adanya penguncian scroll pada `document.body` saat modal aktif (`document.body.style.overflow = 'hidden'`).
2. Perambatan event sentuh (*touchmove event bubbling*) pada perangkat seluler.
3. Ketiadaan properti `overscroll-behavior` pada kontainer scrollable di dalam modal, sehingga memicu *scroll chaining* ke halaman luar.

---

## 3. Solusi & Remediasi yang Diterapkan

1. Menambahkan `useEffect` pada `PrivacyWarningPopup.tsx` untuk mengunci `document.body.style.overflow = 'hidden'` saat modal terbuka.
2. Menghitung lebar scrollbar desktop (`window.innerWidth - document.documentElement.clientWidth`) dan memberikan padding kompensasi sementara pada `document.body.style.paddingRight` untuk mencegah pergeseran tata letak (*layout shift*).
3. Menambahkan class `touch-none` pada elemen backdrop dan `overscroll-contain` pada wadah modal untuk mencegah *touch chaining*.
4. Mengembalikan gaya asli `body` seketika saat modal ditutup atau di-*unmount*.

