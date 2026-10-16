# Laporan Bug: Background Page Scrollable Saat Modal Overlay Peringatan Privasi / Terms Muncul

- **ID Tiket**: BUG-12 / `SCRUM-50`
- **Tanggal**: 16 Oktober 2026
- **Tingkat Keparahan**: **Sedang (Medium - UI / UX Disorientation)**
- **Epic Jira**: `SCRUM-11 Voice, a11y, i18n` (UI Remediation)
- **Komponen Terdampak**:
  - `apps/web/src/components/ui/PrivacyWarningPopup.tsx`
  - `apps/web/src/app/page.tsx`
- **Terkait Task**: [`docs/AMD_TRACK2_TASKS.md` (AMD-13 & AMD-10)](../AMD_TRACK2_TASKS.md)

---

## 1. Ringkasan Masalah
Pada kunjungan pertama kali pengguna ke situs Dengar.in, komponen `PrivacyWarningPopup` ditampilkan setelah jeda 600ms dengan overlay latar belakang (*backdrop*) gelap (`bg-[#151515]/60`). Modal ini memuat pesan etika dan batasan privasi sebelum bercerita ("Jaga privasimu", aturan tanpa nama asli/alamat, dan penegasan anonimitas).

Namun, terdapat cacat fungsional (*UX bug*) di mana halaman latar belakang (`document.body`) tidak dikunci. Pengguna masih dapat menggulir (*scroll*) seluruh konten halaman beranda di balik overlay menggunakan roda mouse, trackpad, gesture usap layar sentuh pada perangkat seluler, maupun tombol keyboard (`Space`, `PageDown`, `ArrowDown`). Hal ini menyebabkan disorientasi visual dan merusak hierarki modal dialog menurut standar aksesibilitas WAI-ARIA `alertdialog` / `aria-modal="true"`.

---

## 2. Analisis Akar Masalah (Root Cause)
1. **Ketiadaan Body Scroll Lock**:
   Pada `PrivacyWarningPopup.tsx`, keadaan `isVisible === true` hanya mengontrol render elemen DOM tanpa memodifikasi `document.body.style.overflow`.
2. **Event Bubbling & Touch Dragging di Mobile**:
   Elemen overlay backdrop tidak memiliki pembatasan sentuhan (`touch-action`), sehingga event `touchmove` pada perangkat layar sentuh merambat ke viewport halaman di belakangnya.
3. **Scroll Chaining di Dalam Kontainer Modal**:
   Kontainer kartu modal (`.bezel-core`) yang memiliki `overflow-y-auto` tidak dilengkapi dengan properti CSS `overscroll-behavior`, sehingga ketika pengguna menggulir teks di dalam modal hingga menyentuh batas atas atau bawah, momentum gulir diteruskan (*scroll chaining*) ke halaman luar.

---

## 3. Langkah Reproduksi
1. Buka peramban pada mode penyamaran (*Incognito / Private Browsing*) atau hapus kunci penyimpanan via DevTools Console:
   ```javascript
   localStorage.removeItem('dengarin_privacy_warning_dismissed');
   ```
2. Muat ulang halaman `http://localhost:3000`.
3. Tunggu hingga modal *"Jaga privasimu"* muncul di layar.
4. Tanpa menekan tombol *"Saya mengerti, lanjutkan"*, lakukan scroll ke bawah menggunakan mouse wheel atau usap layar.
5. **Hasil Sebelum Perbaikan**: Konten landing page di balik overlay bergerak turun dan bergeser secara bebas.

---

## 4. Remediasi yang Diterapkan
Perbaikan dilakukan pada berkas [`PrivacyWarningPopup.tsx`](../../apps/web/src/components/ui/PrivacyWarningPopup.tsx):
1. **Penguncian Scroll Body & Kompensasi Scrollbar**:
   Menambahkan `useEffect` yang mengunci scroll `document.body.style.overflow = 'hidden'` selama `isVisible === true`. Menghitung lebar scrollbar desktop (`window.innerWidth - document.documentElement.clientWidth`) dan menambahkan kompensasi `paddingRight` sementara untuk mencegah pergeseran tata letak (*zero layout shift*).
2. **Pencegahan Touch Leaks & Chaining**:
   Menambahkan utility class `touch-none` pada backdrop overlay dan `overscroll-contain` pada wadah modal serta elemen `.bezel-core`.
3. **Pembersihan Bersih (Clean Teardown)**:
   Saat pengguna mengonfirmasi ("Saya mengerti, lanjutkan"), menutup (X), menekan Escape, atau saat komponen di-*unmount*, fungsi cleanup mengembalikan gaya asli `body` seketika.

---

## 5. Bukti Verifikasi
- **Commit Git**: `11f4795` (*feat: enhance PrivacyWarningPopup functionality and styling*)
- **Pemeriksaan Tipe & Linting**:
  ```bash
  npm run typecheck && npm run lint
  # Exit code 0 (bersih tanpa error atau peringatan).
  ```
- **Pengujian Manual**:
  Pada sesi peramban baru, saat modal muncul, scrolling mouse/touch/keyboard pada halaman belakang 100% terblokir. Setelah menekan tombol konfirmasi, popup tertutup mulus dan scroll halaman kembali normal tanpa lompatan tata letak.

