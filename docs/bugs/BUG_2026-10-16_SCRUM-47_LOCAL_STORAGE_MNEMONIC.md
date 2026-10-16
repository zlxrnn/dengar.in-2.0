# BUG-09 — Risiko mnemonic pada perangkat bersama

Task audit: [SCRUM-19](https://iqbaldovandraa.atlassian.net/browse/SCRUM-19).
Nama file historis menyebut SCRUM-47 secara keliru; tiket itu adalah task prompt, bukan bug ini.

## Teramati

`initAnonymousSession`/`saveAnonymousSession` menyimpan recoveryMnemonic pada `dengarin_anonymous_session` dalam localStorage. Baseline pada `tests/security/abuseChecks.test.mjs` membuktikannya dengan storage sintetis. Catatan lokal juga dapat dibaca oleh orang yang mengakses profil peramban yang sama.

## Batas bukti dan tindak lanjut

Ini risiko retensi kunci pada perangkat bersama. Pengambilalihan jarak jauh atau pembacaan seluruh backup tanpa akses perangkat/kunci belum dibuktikan. Menyimpan kunci enkripsi tambahan di storage yang sama tidak memperbaiki ancaman tersebut.

Penguncian dengan rahasia pengguna, retensi mnemonic, dan UX pemulihan memerlukan desain Privacy Owner agar pengguna tidak kehilangan akses backup. Tidak ada perubahan storage/kriptografi dalam patch audit ini; status risiko tetap terbuka. Fitur hapus seluruh data lokal tetap tersedia. Baseline test yang lulus bukan bukti risiko ini sudah diperbaiki.
