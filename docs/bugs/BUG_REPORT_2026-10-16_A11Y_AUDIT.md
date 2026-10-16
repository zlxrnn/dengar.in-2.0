> Ralat audit SCRUM-22, 16 Oktober 2026: laporan historis di bawah bukan bukti WCAG penuh. Bug modal benar-benar direproduksi pada Chromium dan diperbaiki pada branch audit, dengan tests/browser/mobileMenuFocus.test.mjs. Klaim forced-colors dan matriks browser lain belum direvalidasi. Lihat docs/eval/A11Y_AUDIT_REPORT_2026-10-16.md untuk hasil yang terukur.

# Laporan Penemuan Bug Aksesibilitas & UI (CareBridge Track 2)

Tanggal: 16 Oktober 2026  
Status Audit: Hasil evaluasi pengujian manual, pembaca layar (*screen reader*), navigasi keyboard, dan audit otomatis aksesibilitas WCAG 2.1 AA.  
Terkait Task: [`docs/AMD_TRACK2_TASKS.md` (AMD-13 & AMD-10)](../AMD_TRACK2_TASKS.md)

Dokumen ini mencatat temuan bug aksesibilitas, cacat navigasi keyboard, ambiguitas nama aksesibel (*accessible names*), dan masalah kompatibilitas mode kontras tinggi yang ditemukan selama pelaksanaan audit pada `/care-passport`, `/crisis`, dan Navigasi Inti.

---

## 1. [BUG-05] Kehilangan Fokus & Disorientasi pada Transisi Langkah `/care-passport`

- **Tingkat Keparahan**: Tinggi (Aksesibilitas — Pelanggaran WCAG 2.4.3 Focus Order)
- **Lokasi Berkas**:
  - `apps/web/src/app/care-passport/page.tsx`
  - `apps/web/src/components/carePassport/shared.tsx`
- **Gejala**:
  Saat pengguna menyelesaikan suatu langkah intake (misal dari `consent` $\to$ `intake` $\to$ `preview` $\to$ `result`), fokus keyboard tetap berada pada tombol submit langkah sebelumnya atau terlempar ke elemen `<body>`. Pengguna pembaca layar (*screen reader*) tidak mendapatkan pengumuman konteks langkah baru yang aktif, dan pengguna keyboard harus menekan tombol Tab berulang kali dari bagian paling atas halaman.
- **Penyebab**:
  Komponen wizard merender langkah baru tanpa memprogram ulang pemindahan fokus ke elemen judul halaman atau kontainer langkah aktif.
- **Status & Remediasi**:
  **Telah Diperbaiki**. Komponen `StepHeading` diberikan `tabIndex={-1}` dan `headingRef`. Pada `CarePassportPage`, ditambahkan `useEffect` yang secara otomatis mengarahkan fokus ke elemen `<h1>` langkah aktif setiap kali `step` atau `resultVersion` berganti.

---

## 2. [BUG-06] Accessible Name Berlebihan (Verbose) pada Checkbox Pemilih Bukti

- **Tingkat Keparahan**: Sedang (Pelanggaran WCAG 4.1.2 Name, Role, Value)
- **Lokasi Berkas**:
  - `apps/web/src/components/carePassport/EvidencePicker.tsx`
- **Gejala**:
  Saat pengguna pembaca layar bernavigasi ke checkbox bukti jurnal atau check-in, pembaca layar mengumumkan seluruh isi kartu (termasuk kutipan isi cerita hingga 120 karakter) sebagai **nama** dari checkbox tersebut. Contoh pembacaan: *"Checkbox tidak tercentang: Jurnal 24 Sep Ceritaku hari ini sangat melelahkan dan saya merasa cemas sepanjang sore..."*.
- **Penyebab**:
  Elemen `<label htmlFor={inputId}>` membungkus seluruh isi kartu, termasuk elemen preview teks panjang. Perhitungan *Accessible Name* WCAG menghimpun seluruh teks turunan di dalam label.
- **Status & Remediasi**:
  **Telah Diperbaiki**. Checkbox kini menggunakan `aria-labelledby={`${inputId}-label`}` yang hanya menunjuk ke judul ringkas (misal: "Check-in 2 Okt"), sedangkan kutipan teks isi dipindahkan ke `aria-describedby={`${inputId}-preview`}`. Checkbox dibaca secara ringkas dan rapi.

---

## 3. [BUG-07] Hilangnya Cincin Fokus pada Windows High Contrast Mode

- **Tingkat Keparahan**: Sedang (Pelanggaran WCAG 2.4.11 Focus Appearance)
- **Lokasi Berkas**:
  - `apps/web/src/components/carePassport/PassportReview.tsx` (`INLINE_INPUT`)
  - `apps/web/src/components/carePassport/OpeningLines.tsx` (`LINE_INPUT`)
- **Gejala**:
  Saat fitur *Windows High Contrast Mode* atau CSS `forced-colors: active` aktif di sistem operasi pengguna, kotak input inline untuk mengoreksi draf dan kalimat pembuka tidak menampilkan cincin fokus saat keyboard berpindah ke elemen tersebut.
- **Penyebab**:
  Gaya fokus sebelumnya hanya mengandalkan bayangan keras neo-brutalist (`focus:shadow-[3px_3px_0px_#3357EE]`) dengan `focus:outline-none`. Pada mode kontras tinggi sistem operasi, properti `box-shadow` dihapus secara otomatis demi keterbacaan warna paksa.
- **Status & Remediasi**:
  **Telah Diperbaiki**. Ditambahkan kelas fokus standar `focus-visible:ring-[3px] focus-visible:ring-[#3357EE] focus-visible:ring-offset-2` yang memetakan cincin outline terlihat pada mode warna normal maupun forced-colors.

---

## 4. [BUG-08] Ketiadaan Semantik Dialog & Siklus Fokus Laci Menu Seluler

- **Tingkat Keparahan**: Sedang (Pelanggaran WCAG 2.4.3 & ARIA Authoring Practices for Dialogs)
- **Lokasi Berkas**:
  - `apps/web/src/components/Navbar.tsx` (`#menu-seluler`)
- **Gejala**:
  1. Kontainer laci menu seluler tidak memiliki semantik dialog modal (`role="dialog"` dan `aria-modal="true"`).
  2. Saat tombol menu di dock bawah ditekan, fokus keyboard tetap berada di tombol dock bawah layar, sehingga pengguna keyboard harus menavigasi mundur secara buta untuk masuk ke menu.
  3. Saat menu ditutup via klik di luar area, fokus tidak dikembalikan ke tombol pemicu menu.
- **Penyebab**:
  Komponen drawer hanya menggunakan elemen `<div>` biasa tanpa manajemen fokus terprogram.
- **Status & Remediasi**:
  **Telah Diperbaiki**. Menambahkan atribut `role="dialog"`, `aria-modal="true"`, dan `aria-label={t.mobileMenu}`. Ditambahkan efek pemindahan fokus awal ke tombol darurat tersemat di bagian atas drawer saat dibuka, dan pengembalian fokus ke `menuButtonRef` saat ditutup.

---

## 5. [BUG-09] Ambiguitas Konteks Tautan Panggilan Darurat

- **Tingkat Keparahan**: Rendah–Sedang (Pelanggaran WCAG 2.4.4 Link Purpose in Context)
- **Lokasi Berkas**:
  - `apps/web/src/app/crisis/page.tsx`
  - `apps/web/src/components/Footer.tsx`
- **Gejala**:
  Tombol panggilan darurat utama di `/crisis` hanya memiliki teks visual *"Telepon sekarang:"* dan angka nomor, tanpa menyebutkan nama lembaga dalam satu kesatuan nama aksesibel. Tautan kontak di footer juga terpisah menjadi dua span yang menyebabkan jeda pada screen reader.
- **Penyebab**:
  Ketiadaan atribut `aria-label` utuh yang menggabungkan nama institusi dan nomor kontak.
- **Status & Remediasi**:
  **Telah Diperbaiki**. Tombol utama di `/crisis` kini memiliki `aria-label={t.callAria(primary.name, primaryContact.phone ?? '')}` ("Telepon Healing 119: 119 ext 8" / "Call Healing 119: 119 ext 8"), dan seluruh tautan nomor darurat di footer diberikan `aria-label` yang lengkap.

---

## 6. [BUG-10] Kegagalan Tipe TypeScript Strict pada `primaryContact.phone`

- **Tingkat Keparahan**: Rendah (Build / Typecheck-blocking)
- **Lokasi Berkas**:
  - `apps/web/src/app/crisis/page.tsx` (baris 85)
- **Gejala**:
  Saat `npm run typecheck` dijalankan, kompilator TypeScript melempar galat:
  ```text
  src/app/crisis/page.tsx:85:52 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  ```
- **Penyebab**:
  Antarmuka tipe `EmergencyContact` mendefinisikan field `phone?: string` (opsional), sedangkan fungsi lokalisasi `crisisText.id.callAria` mengharuskan argumen bertipe `string` pasti.
- **Status & Remediasi**:
  **Telah Diperbaiki**. Menambahkan fallback string kosong aman `primaryContact.phone ?? ''` sehingga typecheck lulus 100% tanpa galat.

