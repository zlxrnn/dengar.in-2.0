# BUG-20261016-11: Cacat Aksesibilitas WCAG pada Care Passport & Navigasi Mobile

- **ID Tiket**: BUG-05 s/d BUG-08 / `SCRUM-22` / `AMD-13`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tingkat Keparahan**: Sedang–Tinggi (Medium–High - WCAG 2.1 AA Compliance)
- **Komponen Terdampak**: `apps/web/src/app/care-passport/page.tsx`, `EvidencePicker.tsx`, `PassportReview.tsx`, `Navbar.tsx`

---

## 1. Gejala & Ringkasan Masalah

Audit aksesibilitas menggunakan pembaca layar (*screen reader*) dan navigasi keyboard mengungkap serangkaian pelanggaran standar WCAG 2.1 AA:

1. **Kehilangan Fokus pada Transisi Langkah Wizard (WCAG 2.4.3)**: Saat pengguna berpindah langkah di `/care-passport` (misal dari consent ke intake atau review), fokus keyboard terlempar ke `<body>` atau tertinggal di tombol submit sebelumnya, membingungkan pengguna tunanetra.
2. **Accessible Name Berlebihan pada Checkbox Bukti (WCAG 4.1.2)**: Elemen label membungkus seluruh kartu bukti, sehingga screen reader mengumumkan kutipan cerita sepanjang 120+ karakter sebagai *nama* checkbox.
3. **Hilangnya Cincin Fokus pada Windows High Contrast Mode (WCAG 2.4.11)**: Input inline hanya menggunakan `box-shadow` dengan `outline-none`. Pada mode kontras tinggi OS, `box-shadow` dihapus sehingga indikator fokus hilang sepenuhnya.
4. **Ketiadaan Focus Trap & Dialog Semantics pada Drawer Seluler (WCAG 2.4.3)**: Menu seluler tidak memiliki `role="dialog"`, `aria-modal="true"`, dan fokus keyboard lolos ke konten utama di balik drawer.

---

## 2. Analisis Akar Masalah (Root Cause)

- Kurangnya pemrograman perpindahan fokus terarah (`ref.focus()`) pada siklus hidup state wizard.
- Struktur semantik HTML yang membungkus konten deskriptif panjang di dalam `<label htmlFor="...">`.
- Ketergantungan pada styling bayangan CSS (*box-shadow*) tanpa menyertakan outline standar peramban.
- Elemen drawer menu seluler hanya berupa `<div>` statis tanpa penanganan keyboard trap.

---

## 3. Solusi & Remediasi yang Diterapkan

1. **Step Heading Focus**: Komponen `StepHeading` diberi `tabIndex={-1}` dan `headingRef`. `useEffect` pada `CarePassportPage` memindahkan fokus ke judul langkah aktif secara otomatis setiap kali rute atau langkah berganti.
2. **Pemisahan Label & Deskripsi**: Checkbox bukti kini menggunakan `aria-labelledby` untuk nama ringkas ("Jurnal 15 Okt") dan `aria-describedby` untuk kutipan cerita pratinjau.
3. **Cincin Fokus Universal**: Menambahkan kelas `focus-visible:ring-[3px] focus-visible:ring-[#3357EE] focus-visible:ring-offset-2` yang tetap terlihat di bawah mode warna normal maupun `forced-colors: active`.
4. **Semantik Dialog & Focus Management**: Menambahkan `role="dialog"`, `aria-modal="true"`, inisialisasi fokus ke tombol pertama drawer, serta pengembalian fokus ke tombol pemicu saat drawer ditutup.

