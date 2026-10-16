# BUG-10 — Risiko backupId pada URL, log produksi belum dibuktikan

Task audit: [SCRUM-19](https://iqbaldovandraa.atlassian.net/browse/SCRUM-19).
Nama file historis menyebut SCRUM-48 secara keliru; tiket itu adalah task training, bukan bug ini.

**Pemilik area:** Justin (Safety/Privacy).

## Teramati

Klien recovery menggunakan GET `/api/sync?backupId=...`; route membaca query parameter dan memvalidasi HEX_256. Identifier dapat dicatat oleh infrastruktur bila request URL direkam.

## Ralat reproduksi

Contoh lama `mock_sync_id_synthetic_01928374` tidak memenuhi HEX_256; log respons 200 yang ditampilkan bukan bukti observasi sukses. `curl -I` mengirim HEAD, bukan GET. Fetch API sendiri tidak menambah entry navigasi pada browser history.

Untuk memverifikasi risiko secara lokal, gunakan ID sintetis 64 digit heksadesimal, request GET, dan konfigurasi logging proxy yang terdokumentasi. Jangan memakai identifier pengguna nyata. Pada audit ini tidak ada log produksi yang diambil, sehingga klaim kebocoran produksi tetap belum terverifikasi.

Migrasi protokol ke header/body dan redaksi log merupakan opsi hardening. Belum ada perubahan API sync pada patch ini; tidak ada klaim risiko telah ditutup.
