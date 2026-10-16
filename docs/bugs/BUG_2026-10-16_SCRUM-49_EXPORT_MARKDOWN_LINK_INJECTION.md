# Bug Report: Unsanitized Markdown Hyperlink Injection in Exported Care Passport Documents

- **ID Tiket**: BUG-11 / `SCRUM-49`
- **Tanggal**: 16 Oktober 2026
- **Tingkat Keparahan**: **Tinggi (High)**
- **Epic Jira**: `SCRUM-5 CareBridge`
- **Penanggung Jawab**: I Wayan Bagus Arya Darma Wiguna
- **Komponen Terdampak**:
  - `apps/web/src/lib/carePassportExport.ts` (fungsi `presentValues`, `buildCarePassportExport`)
- **Domain Keamanan**: Domain 6: Export & Downstream Ingestion
- **Kebijakan Data**: **100% Data Sintetis (Zero Production User Data)**

---

## 1. Ringkasan Masalah
Fungsi `buildCarePassportExport` menyusun draf ringkasan paspor medis ke dalam format Markdown (`.md`) dengan menyematkan nilai-nilai draf yang telah disetujui pengguna langsung ke dalam baris daftar:
```typescript
const bullet = (value: string) => (md ? `- ${value}` : `- ${value}`);
```
Jika cerita atau kutipan pengguna memuat sintaks tautan Markdown (misalnya `[Klinik Terpercaya](https://phishing-domain.invalid/login)`), generator ekspor tidak melakukan pembersihan atau netralisasi karakter kurung siku `[` `]` maupun kurung biasa `(` `)`.

---

## 2. Analisis Dampak & Skenario Ancaman
- **Phishing Layanan Kesehatan / Penipuan**: Dokumen Care Passport dimaksudkan untuk dicetak atau dikirimkan kepada dokter/psikolog saat konsultasi klinis. Apabila dokumen resmi ini memuat tautan berbahaya yang dapat diklik (*live clickable hyperlinks*), tenaga medis atau pasien dapat tertipu mengunjungi domain berbahaya yang disamarkan sebagai rujukan kesehatan.
- **Integritas Dokumen Medis Terkompromi**: Dokumen ekspor resmi Dengar.in tidak seharusnya menjadi vektor penyebaran tautan eksternal yang tidak diverifikasi.

---

## 3. Langkah Reproduksi (Menggunakan Data Sintetis)
1. Eksekusi fungsi pembuatan ekspor paspor dengan nilai sintetis:
   ```javascript
   const passport = {
     version: 1,
     reviewStatus: 'user_approved',
     concerns: [{ value: 'Saya disarankan mengunjungi [Portal Bantuan](https://phishing-scam.invalid)', source: 'user_input' }],
     dailyImpact: [],
     duration: { value: null, source: 'unknown' },
     relevantContext: [],
     questionsForProfessional: [],
     unknowns: [],
     disclaimer: 'Disclaimer medis'
   };
   const md = buildCarePassportExport(passport, { format: 'md' });
   console.log(md);
   ```
2. Amati teks Markdown yang dihasilkan:
   ```markdown
   ## KEKHAWATIRAN UTAMA
   - Saya disarankan mengunjungi [Portal Bantuan](https://phishing-scam.invalid)
   ```
3. Format tautan Markdown tetap hidup dan aktif (*clickable link*).

---

## 4. Rekomendasi Remediasi
1. Terapkan fungsi pembersihan karakter format Markdown (*Markdown escaping*) pada `presentValues()` di `carePassportExport.ts`:
   ```typescript
   function escapeMarkdown(text: string): string {
     return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
   }
   ```
2. Gantikan karakter `[` dan `]` atau netralkan sintaks URL sebelum merender berkas `.md`.

