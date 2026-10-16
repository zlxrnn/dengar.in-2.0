# BUG-20261015-01: `datasetArtifacts.test.mjs` gagal karena dependency `protobufjs` tidak terinstall

**Ditemukan oleh:** Agen AI (saat eksekusi rencana kerja SCRUM Safety task, 15 Okt 2026)  
**Tanggal:** 2026-10-15  
**Status:** Belum diperbaiki  
**Prioritas:** Rendah (pre-existing, di luar scope task safety)  
**Pemilik file:** `@YanIanZ` (area `tests/carebridge/`)  

---

## Deskripsi

Test `tests/carebridge/datasetArtifacts.test.mjs` selalu gagal dengan error:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'protobufjs'
imported from scripts/carebridge/datasetCodec.mjs
```

Test ini adalah satu-satunya kegagalan saat `npm run test:carebridge` dijalankan (357/358 lulus).

## Reproduksi

```powershell
node --experimental-strip-types tests/carebridge/datasetArtifacts.test.mjs
```

Output:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'protobufjs'
imported from C:\...\scripts\carebridge\datasetCodec.mjs
```

## Penyebab

Package `protobufjs` diperlukan oleh `scripts/carebridge/datasetCodec.mjs`, yang diimpor oleh test `datasetArtifacts.test.mjs`. Package ini tidak terdaftar atau tidak terinstall di `node_modules`.

## Langkah Perbaikan yang Disarankan

1. Periksa apakah `protobufjs` sudah ada di `package.json` root atau di `scripts/package.json`.
2. Jika belum: tambahkan ke `devDependencies` dan jalankan `npm install`.
3. Jika sudah terdaftar: jalankan `npm install` ulang (mungkin `node_modules` belum up-to-date).
4. Sesuai `COLLABORATION_RULES.md` §3, perubahan `package.json` root memerlukan approval Release Owner (iqbal).

## Dampak

- Test suite `npm run test:carebridge` keluar dengan exit code 1 (1 failure dari 358).
- Tidak memblokir logika keselamatan (crisis gate, escalation, validator) yang semua lulus.
- Memblokir `npm run test` agregat (full suite) karena exit code non-zero.

