# Ralat audit keamanan CareBridge — 16 Oktober 2026

Task audit: [SCRUM-19](https://iqbaldovandraa.atlassian.net/browse/SCRUM-19).
Baseline: `d5c6714`. Seluruh payload pengujian sintetis.

| Temuan | Bukti | Kesimpulan |
|---|---|---|
| BUG-09: mnemonic plaintext | Baseline abuse test membaca nilai dari localStorage | Risiko perangkat bersama teramati; bukan bukti pengambilalihan jarak jauh. Perlu keputusan Privacy Owner tentang penguncian/retensi kunci. Belum diperbaiki. |
| BUG-10: backupId pada URL | Source klien dan route GET memakai query parameter | Risiko pencatatan identifier pada infrastruktur; kebocoran log produksi belum dibuktikan. Contoh log lama bersifat ilustrasi. |
| BUG-11: markup pada export | Tes regresi gagal sebelum patch; renderer Markdown menghasilkan link/image/raw HTML | Diperbaiki pada branch ini: escape konten pengguna pada passport dan lampiran kalimat pembuka. `.txt` tidak diubah; atribusi KB tepercaya tetap tersedia. |

## Koreksi referensi dan dampak

SCRUM-47 adalah task prompt; SCRUM-48 adalah task Gemma training. Keduanya bukan tiket bug di atas. SCRUM-49 mengembalikan 404 pada akun audit. Nama file lama dipertahankan agar tautan historis tidak putus; angka dalam nama file bukan referensi Jira yang valid. Ketiga temuan dilacak melalui SCRUM-19 sampai tiket khusus yang benar tersedia.

Export tidak ditandatangani secara digital dan tidak membuktikan integrasi klinis. Dampak BUG-11 bergantung pada renderer yang digunakan penerima; parser dengan HTML aktif dapat meneruskan HTML. Tidak ada klaim XSS pada UI React aplikasi.

## Verifikasi perbaikan BUG-11

- `npm run test:carebridge`: 408 pass, 0 fail.
- `node --experimental-strip-types --test tests/security/abuseChecks.test.mjs`: baseline tautan telah menjadi regression assertion untuk escaping.
- `tests/carebridge/exportMarkup.test.mjs`: 5 tes, mencakup seluruh field, lampiran, format txt, approval gate, dan atribusi KB.
- Pemeriksaan sintetis dengan markdown-it 15.0.3 (`html: true`): sebelum patch terbentuk anchor, image dan raw script; sesudah patch ketiganya tidak terbentuk, termasuk pada lampiran.
- Lint dan typecheck lulus. Pemeriksaan ini bukan bukti deployment produksi.
