# BUG-20261016-15: Pengujian Otomatis Gagal saat Binary Lokal (Redis) atau Port Loopback Dibatasi

- **ID Tiket**: `BUG-20261016-15`
- **Tanggal Ditemukan**: 16 Oktober 2026
- **Status**: **TELAH DIPERBAIKI (RESOLVED)**
- **Tanggal Diperbaiki**: 16 Oktober 2026
- **Tingkat Keparahan**: Sedang (Medium - CI/Developer Test Suite Resilience)
- **Komponen Terdampak**: `tests/redis/integration.test.mjs`, `tests/persistence-pg/tlsSecurity.test.mjs`
- **Solusi Diterapkan**:
  1. Menambahkan pemeriksaan awal (`spawnSync('redis-server', ['--version'])`) pada `tests/redis/integration.test.mjs` yang melakukan graceful skip jika binary `redis-server` tidak terinstal pada sistem lokal, selaras dengan pola pengujian di `tests/persistence-pg/postgresRepositories.test.mjs`.
  2. Menangani `EPERM` error pada pembukaan soket loopback TLS di `tests/persistence-pg/tlsSecurity.test.mjs` sehingga pada lingkungan sandbox atau container terbatas, tes otomatis melakukan `t.skip` alih-alih melempar unhandled rejection.

---

## 1. Gejala & Ringkasan Masalah

1. Saat menjalankan `npm test` di lingkungan developer tanpa Redis lokal terpasang, suite melempar:
   ```text
   FAIL: Error: spawn redis-server ENOENT
   ```
2. Pada lingkungan sandbox berkeamanan ketat tanpa hak koneksi loopback raw TCP socket, `tlsSecurity.test.mjs` mengalami kegagalan dengan:
   ```text
   Error: connect EPERM 127.0.0.1:52198
   ```

---

## 2. Analisis Akar Masalah (Root Cause)

1. `tests/redis/integration.test.mjs` langsung memanggil `spawn('redis-server')` tanpa memeriksa ketersediaan biner pada PATH, berbeda dengan tes PostgreSQL yang memeriksa `process.env.DATABASE_URL` atau tes OpenSSL yang memeriksa ketersediaan biner OpenSSL.
2. `tests/persistence-pg/tlsSecurity.test.mjs` membuat TLS socket server lokal di `127.0.0.1` tanpa menangani error `EPERM` ketika OS membatasi soket loopback.

---

## 3. Langkah Pengujian & Verifikasi

1. Menjalankan `npm test`:
   - `test:redis` menampilkan pesan graceful skip jika binary tidak ditemukan dan keluar dengan kode 0:
     ```text
     tests/redis: redis-server tidak ditemukan di PATH — melewati pengujian integrasi Redis.
     ```
   - `test:persistence-pg` melewati pengujian loopback dengan status `﹣ (skipped)` dan keluar dengan kode 0.
2. Seluruh rangkaian pengujian monorepo lulus 100%.

