# BUG-11 — Konten pengguna menjadi markup pada ekspor Markdown

Task audit: [SCRUM-19](https://iqbaldovandraa.atlassian.net/browse/SCRUM-19).
Nama file historis menyebut SCRUM-49; pembacaan tiket itu mengembalikan 404 pada akun audit. Referensi audit yang valid adalah SCRUM-19.

## Penyebab dan bukti

Builder menyisipkan nilai pengguna langsung ke Markdown, termasuk concerns, dailyImpact, duration, relevantContext, questions, unknowns, disclaimer, reasonQuote dan lampiran kalimat pembuka. Payload sintetis `[Portal](https://phishing.invalid)`, gambar, HTML, dan newline dapat menghasilkan struktur aktif pada renderer downstream.

`tests/carebridge/exportMarkup.test.mjs` gagal sebelum patch. markdown-it 15.0.3 dengan HTML aktif mengonfirmasi anchor/image/raw script sebelum patch. Ini manipulasi dokumen downstream; bukan bukti XSS di UI aplikasi, dan export tidak memiliki tanda tangan digital.

## Invariant dan perbaikan

Konten pengguna pada `.md` diperlakukan sebagai teks literal: karakter markup di-escape dan newline dalam satu field diratakan agar tidak menyisipkan blok baru. `.txt` mempertahankan teks asli. Link sumber KB yang ditentukan aplikasi tetap disertakan. Viewer tertentu dapat tetap mengenali URL teks biasa; patch ini menetralkan markup yang ditulis pengguna, bukan menjanjikan perilaku semua viewer.

Boundary berlaku pula pada appendix editable; formatter dipindahkan ke lib murni agar bisa diuji tanpa React. Approval gate tetap berlaku.

## Verifikasi

5 regression tests baru; 408/408 CareBridge pass. Abuse baseline tautan diganti menjadi assertion bahwa markup di-escape. Pemeriksaan renderer sesudah patch tidak menghasilkan anchor/image/raw script dari payload tersebut. Lint/typecheck pass. Perubahan masih memerlukan review dan rollout; produksi belum dinyatakan diperbaiki.
