# Laporan Bug: Cacat Indikator Halaman Aktif pada Dock Bawah Seluler & State Hijau Permanen Tombol Ngobrol

- **ID Tiket**: BUG-13 / `SCRUM-51`
- **Tanggal**: 16 Oktober 2026
- **Tingkat Keparahan**: **Sedang (Medium - Navigational Confusion / UX Usability)**
- **Epic Jira**: `SCRUM-11 Voice, a11y, i18n` (UI Remediation)
- **Komponen Terdampak**:
  - `apps/web/src/components/Navbar.tsx` (`dock-bottom`, `NgobrolDockButton`, `menu-seluler`)
- **Terkait Task**: [`docs/AMD_TRACK2_TASKS.md` (AMD-13 & AMD-10)](../AMD_TRACK2_TASKS.md)

---

## 1. Ringkasan Masalah
Pada tampilan perangkat seluler (*mobile viewport* lebar $\le 768\text{px}$), navigasi utama bergantung pada bilah dock bawah (*bottom dock navigation*) dengan lima slot tombol. Pengguna melaporkan kebingungan signifikan mengenai halaman mana yang sedang mereka buka saat ini.

Pemeriksaan audit antarmuka mengungkap dua masalah mendasar:
1. **Highlight Tab Aktif Hampir Tidak Terlihat**:
   Tab yang sedang aktif hanya ditandai dengan garis biru 3px di bagian paling atas tombol (`h-[3px] bg-[#3357EE]`) dan warna teks biru gelap (`text-[#2B51E6]`) di atas latar putih bersih. Pada layar ponsel di kondisi luar ruangan atau tingkat kecerahan rendah, indikator ini hampir tidak terlihat.
2. **Tombol "Ngobrol" di Tengah Selalu Berwarna Hijau di Semua Halaman**:
   Tombol tengah (`NgobrolDockButton`) secara statis diberi kelas `bg-[#B8F34A]/70` saat tidak aktif dan `bg-[#B8F34A]` saat aktif. Karena opacity 70% dari hijau lime tetap terlihat sangat mencolok dan kontras dengan latar dock putih, tombol Ngobrol selalu mencuri perhatian visual dan memberikan ilusi palsu bahwa pengguna sedang berada di halaman Ngobrol/Chat pada setiap saat.
3. **Ketiadaan Indikator Aktif untuk Rute Menu Drawer & Tautan Sekunder**:
   Saat pengguna membuka halaman yang berada di dalam drawer Menu (seperti `/journal`, `/forum`, `/care-passport`, `/perjalanan`, `/report`), seluruh tombol di dock bawah berstatus pasif tanpa penanda apa pun. Tautan sekunder di drawer juga tidak memiliki evaluasi kelas aktif.

---

## 2. Analisis Akar Masalah (Root Cause)
1. **Inkonsistensi Token Desain Navigasi Aktif**:
   Pada versi desktop (`centerLinks`) dan drawer seluler (`mobileNavLinks`), token status aktif menggunakan warna hijau lime neo-brutalis (`bg-[#B8F34A]` dengan teks hitam pekat `#151515` dan bayangan tegas `shadow-[2px_2px_0px_#151515]`). Namun pada dock bawah, pengembang sebelumnya secara eksperimental menggunakan garis biru tipis `#3357EE` yang tidak selaras dengan bahasa desain aplikasi.
2. **Hardcoded Styling pada `NgobrolDockButton`**:
   Tombol Ngobrol didesain sebagai aksi tengah yang menonjol menggunakan `bg-[#B8F34A]/70`, tetapi hal ini mengorbankan kejelasan hierarki status halaman aktif (*active navigation state*).
3. **Pencocokan Rute Kaku (*Strict Equality*)**:
   Ekspresi `pathname === item.href` gagal mencocokkan sub-rute bertingkat (misal `/assessment/result` ke `/assessment`) serta tidak menghubungkan rute landing page `/` dengan `/dashboard`.

---

## 3. Langkah Reproduksi
1. Buka peramban pada mode seluler (lebar layar 390px, misal iPhone / Android).
2. Akses `http://localhost:3000/dashboard` (Beranda):
   - Perhatikan dock bawah: Tombol tengah "Ngobrol" tampak berwarna hijau terang, sementara tombol "Beranda" hanya memiliki garis biru tipis. Pengguna merasa sedang berada di menu Ngobrol.
3. Ketuk tab "Misi" (`/mission`):
   - Tombol "Misi" hanya berubah warna teks menjadi biru gelap tipis, sementara tombol "Ngobrol" tetap berwarna hijau.
4. Buka Menu $\to$ pilih "Jurnal" (`/journal`):
   - Di dock bawah, tidak ada satu pun dari 5 tombol yang aktif.

---

## 4. Remediasi yang Diterapkan
Perbaikan diterapkan pada berkas [`Navbar.tsx`](../../apps/web/src/components/Navbar.tsx):
1. **Helper `isRouteActive`**:
   Mendukung pencocokan sub-rute (`pathname.startsWith(href + '/')`) serta pemetaan beranda (`/dashboard` dan `/`).
2. **Standarisasi Badge Neo-brutalis Hijau Lime (`#B8F34A`)**:
   Setiap tab di dock bawah yang sedang aktif kini menampilkan kartu neo-brutalis resmi:
   `bg-[#B8F34A] text-[#151515] border-[#151515] shadow-[2px_2px_0px_#151515] font-bold`
   Tab inaktif berlatar transparan bersih dengan teks netral `text-[#59544D]`.
3. **Normalisasi Status `NgobrolDockButton`**:
   Tombol tengah hanya berwarna hijau saat rute chat (`/chat`, `/ruang-ngobrol`) sedang aktif atau saat menu popover terbuka. Saat tidak aktif, tampilannya bersih dan setara dengan tombol lainnya.
4. **Indikator Aktif Tombol "Menu"**:
   Jika pengguna membuka rute apa pun yang bersumber dari menu (seperti Jurnal, Forum, Perjalanan, dll.), tombol "Menu" di dock bawah menyala hijau aktif, dan item yang bersangkutan di drawer menu menampilkan badge `[Halaman ini]`.

---

## 5. Bukti Verifikasi
- **Pemeriksaan Tipe & Linter**:
  ```bash
  npm run typecheck && npm run lint
  # Exit code 0 (bersih tanpa error atau peringatan).
  ```
- **Pengujian Manual di Tampilan Seluler**:
  - Pada `/dashboard`, hanya tombol Beranda yang menyala hijau tegas berbayangan.
  - Saat berpindah ke `/mission`, `/checkin`, atau `/chat`, tab yang sesuai langsung menyala hijau tegas secara instan.
  - Kontras teks hitam di atas hijau lime mencapai **12.6:1** (Lolos **WCAG AAA**).

