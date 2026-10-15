# SCRUM-43 — Draft training Gemma di AMD TokenFactory

Status: **DRAFT / belum dijalankan**, 16 Oktober 2026. Kredit AMD USD 100 belum
bisa diakses, sesuai konfirmasi pengguna. Tidak ada instance dibuat, kredit
digunakan, bobot diunduh, atau model hasil training yang diklaim tersedia.

## Target dan batas pekerjaan

Eksperimen LoRA untuk memahami Indonesia informal, Inggris, dan code-switching
dalam penyusunan Care Passport yang berlandaskan cerita pengguna. Pertahankan
kontrak JSON runtime, ketidakpastian, dan kutipan sumber; jangan menambah diagnosis,
obat, atau fakta yang tidak disebutkan. Ini adalah fine-tuning model teks.
Pelafalan dan karakter suara tetap pekerjaan TTS; kemampuan mengenali mikrofon
tetap pekerjaan STT. Adapter Gemma tidak otomatis melatih kedua komponen itu.

Jalur produksi tetap TokenFactory yang sudah tervalidasi. Tidak ada perubahan
provider, crisis gate, consent, redaksi PII, atau validator dalam draft ini.

## Akses yang telah diperiksa

- Endpoint inference yang digunakan aplikasi: `https://developer.amd.com.cn/radeon/api/v1`.
- Pemeriksaan read-only `/radeon/api/notebook/status` dengan credential runtime
  mengembalikan HTTP 401. Ini belum membuktikan instance tersedia atau kuota habis.
- Tunggu akses kredit/instance dari pengguna; jangan merotasi key aplikasi atau
  membuat instance sebagai percobaan. Dokumentasi [autentikasi AMD](https://amd-aim.github.io/radeon-cloud-docs/api/authentication/)
  membedakan API key dan sesi browser.

## Data sebelum training

1. Buat korpus latihan sintetis baru, terpisah dari
   `tests/carebridge/dataset/cases.v1.jsonl` (67 kasus evaluasi) dan golden fixtures.
   Jangan mengubah kasus evaluasi menjadi contoh latihan atau memakai laporan
   provider sebagai label yang dianggap benar.
2. Target awal 300 pasangan cerita → JSON: Indonesia 150, Inggris 90,
   code-switch 60. Target ini belum terpenuhi. Variasikan bahasa formal/santai,
   slang, negasi, ketidakpastian, durasi, dan atribusi cerita orang lain.
3. Label jawaban dibuat/diperiksa manusia menggunakan kontrak Care Passport dan
   validator proyek. Simpan `id`, `language`, `scenarioGroup`, `synthetic: true`,
   `reviewStatus`, `input`, dan `target`. Hanya `reviewStatus: approved` masuk training.
4. Pisahkan berdasarkan `scenarioGroup` sebelum parafrase: 80% train, 10%
   validation, 10% holdout. Semua variasi satu skenario berada pada split yang sama.
   Tolak input duplikat lintas split dan yang cocok dengan korpus evaluasi setelah
   normalisasi Unicode, spasi, kapitalisasi, dan tanda baca; tinjau kemiripan
   semantik secara manual karena pencocokan teks tidak cukup.
5. Data krisis dipakai untuk menguji gate tanpa panggilan model, bukan melatih
   Gemma agar menggantikan gate. Jangan memasukkan percakapan produksi, PII,
   data scraping, key, atau audio pengguna. Safety/QA meninjau label dan lisensi.

## Konfigurasi eksperimen yang diusulkan

| Parameter | Draft |
|---|---|
| Model ID + revision | Belum dipilih; verifikasi akses lisensi, dukungan ROCm dan VRAM dahulu |
| Metode | LoRA, bf16 bila GPU mendukung; tanpa full fine-tuning |
| LoRA rank / alpha / dropout | 16 / 32 / 0.05 |
| Learning rate / epochs | 0.0001 / maksimal 2; simpan checkpoint terbaik menurut validation loss |
| Batch / gradient accumulation | 1 / 8, revisi berdasarkan VRAM nyata |
| Sequence length | 2048; tolak contoh terlalu panjang, jangan memotong jawaban diam-diam |
| Loss | Token jawaban assistant saja; prompt dan padding dimask |
| Seed | 43 |
| Output | Adapter + tokenizer + manifest SHA dataset, split, model revision dan versi runtime |
| Telemetri | Metadata/loss saja; tanpa prompt, cerita, token akses atau integrasi tracking eksternal |

Referensi implementasi: [AMD PyTorch/ROCm fine-tuning](https://developer.amd.com/playbooks/pytorch-finetuning/)
dan [AMD Unsloth fine-tuning](https://developer.amd.com/playbooks/unsloth-llms-finetuning/).
Pilih satu stack setelah GPU diketahui. Catat `rocminfo`, versi ROCm/PyTorch,
kapasitas VRAM, ruang disk, dukungan model, dan biaya/jam sebelum menjalankan.
Estimasi biaya belum tersedia; jangan menyebut USD 100 cukup sebelum harga dan
durasi pilot terukur. Pilot 10 optimizer steps harus lolos sebelum run penuh.

## Evaluasi dan syarat promosi

- Bandingkan base dan adapter pada holdout identik: JSON parse/schema rate,
  grounding/unsupported claims, missing facts, escalation, p50/p95, dan N per bahasa.
- Jalankan 67 kasus evaluasi dan golden cases tanpa melatih pada keduanya.
  Catat kegagalan provider terpisah dari kegagalan konten.
- Gate krisis harus tetap menghasilkan nol panggilan model; consent dan redaksi
  PII tetap sebelum inference. Tidak ada promosi jika grounding/safety memburuk.
- Nilai ID/EN/code-switching terpisah; output JSON valid atau loss lebih rendah
  tidak sendirinya membuktikan kualitas bahasa atau keamanan.
- Simpan hasil nyata sebagai bukti lokal, bukan data pengguna di Git. Review
  Safety/QA dan persetujuan PR tetap diperlukan sebelum perubahan produksi.
- Serving authenticated HTTPS, flag default OFF, evaluasi rollback dan bukti AMD
  mengikuti `CB-035_GOOGLE_DEEPMIND_GEMMA_AMD.md`. Tidak ada pergantian otomatis
  ke adapter yang belum dievaluasi.

## Langkah saat akses kredit pulih

Konfirmasi instance/harga → pilih model/revision → buat dan review korpus baru →
validasi split → siapkan environment ROCm → pilot → training → evaluasi berpasangan →
review → serving uji. Hentikan instance yang khusus dibuat untuk eksperimen setelah
adapter/bukti tersimpan; jangan menghentikan instance bersama tanpa koordinasi.
