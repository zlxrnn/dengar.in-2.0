# BUG-20261016-08: Injeksi Markdown & Phishing Links pada Ekspor Dokumen Care Passport

- **ID Tiket**: BUG-11 / `TH-07` / `SCRUM-19`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tingkat Keparahan**: **Tinggi (High - Downstream Document Manipulation / Phishing Risk)**
- **Komponen Terdampak**: `apps/web/src/lib/carePassportExport.ts`, `apps/web/src/components/carePassport/OpeningLines.tsx`
- **Solusi Diterapkan**: Escaping karakter markup Markdown pada teks input pengguna saat diekspor.

---

## 1. Gejala & Ringkasan Masalah

Pada fitur ekspor Care Passport (`buildCarePassportExport`), pengguna dapat mengunduh ringkasan klinis dalam format `.md` atau `.txt` untuk dibawa ke tenaga profesional.

Sebelumnya, teks input yang ditulis pengguna (seperti keluhan, kutipan cerita, dampak harian, atau kalimat pembuka) disisipkan secara mentah (*verbatim*) ke dalam template Markdown. Jika pengguna memasukkan tautan markdown seperti:
```markdown
[Pusat Krisis Resmi](https://phishing-site.invalid/login)
```
atau tag gambar/HTML, berkas `.md` yang diunduh akan merender tautan aktif atau elemen gambar saat dibuka oleh pihak downstream (misalnya dokter yang membuka file di pembaca Markdown). Hal ini membuka celah serangan *social engineering* dan manipulasi dokumen.

---

## 2. Analisis Akar Masalah (Root Cause)

1. Tidak adanya sanitasi / *escaping* karakter khusus Markdown (`[`, `]`, `(`, `)`, `*`, `#`, `<script>`, dll.) pada teks masukan pengguna sebelum digabungkan ke string template Markdown.
2. Karakter baris baru ganda (`\n\n`) di dalam satu input dapat memecah blok kutipan dan menyuntikkan judul atau paragraf palsu ke dalam dokumen resmi.

---

## 3. Solusi & Remediasi yang Diterapkan

1. **Escaping Teks Pengguna**:
   - Menambahkan filter *escaping* pada fungsi pembentuk Markdown di `apps/web/src/lib/carePassportExport.ts`, sehingga karakter `[` diubah menjadi `\[`, `]` menjadi `\]`, dsb.
   - Meratakan karakter newline di dalam field tunggal agar tidak memecah struktur paragraf dokumen.
2. **Uji Regresi Otomatis**:
   - Menambahkan pengujian khusus pada `tests/carebridge/exportMarkup.test.mjs` (5 skenario pengujian) dan verifikasi di `tests/security/abuseChecks.test.mjs` yang memastikan tautan berbahaya dinetralkan menjadi teks literal.

