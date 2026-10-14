# CB-035 — Keputusan Go/No-Go: Gemma di AMD GPU + ROCm untuk Google partner prize

**Jira:** SCRUM-30 (spike, timebox)  
**Tanggal riset:** 14 Oktober 2026 (WIB). Semua URL diakses pada tanggal ini.  
**Owner dokumen:** YanIanZ (area `docs/CB-035_*`)  
**Dokumen induk:** [CB-035_GOOGLE_DEEPMIND_GEMMA_AMD.md](CB-035_GOOGLE_DEEPMIND_GEMMA_AMD.md) (checklist + DoD), [CAREBRIDGE_STRUCTURE_MERMAID.md §11.1](CAREBRIDGE_STRUCTURE_MERMAID.md), [AMD_SETUP.md §0–§2, §9](AMD_SETUP.md), [AMD_01_SCOPE_DAN_SYARAT.md §3, §7](AMD_01_SCOPE_DAN_SYARAT.md), [AI_POLICY.md §5](AI_POLICY.md), [TESTBENCH.md](TESTBENCH.md).

Tag status: **OK** = terbukti (sumber resmi atau trace kita sendiri) · **RISK** = terbukti tetapi berisiko · **VERIFY** = belum ada konfirmasi tertulis; jangan dianggap benar. Kata "eligible" **tidak** dipakai di dokumen ini sampai ada jawaban tertulis dari organizer.

---

## 1. Ringkasan keputusan

**Rekomendasi: GO terbatas ("Go-Lite").**

> **Keputusan tim (14 Okt 2026):** Dengar.in memakai AMD Token Factory **tanpa** kredit AMD Developer Cloud. Opsi B (VM MI300X + vLLM sendiri) **ditutup**, bukan sekadar ditunda; pemicu §5 menuju Go penuh tidak berlaku lagi. Yang tersisa hanya Go-Lite (opsi A) atau No-Go total, tergantung jawaban organizer (§7).

1. **GO** untuk pekerjaan murah dan reversibel: feature flag `CAREBRIDGE_GEMMA_ENABLED` (default OFF), provider Gemma yang memakai ulang `createAmdProvider`, uji rollback, dan pengumpulan bukti (model id, trace, latensi) dari Gemma-4-31B-IT yang **sudah berjalan** di AMD Token Factory. Estimasi 0,5–1 hari kerja satu orang, tanpa biaya, tanpa VM.
2. **NO-GO (saat ini)** untuk menyewa VM MI300X dan menjalankan vLLM Gemma sendiri hanya demi bukti `rocminfo`/`rocm-smi`. Alasan: aturan Google prize untuk ACT III tidak dipublikasikan, kredit/billing AMD Developer Cloud belum di tangan tim, P0 Token Factory belum stabil (429/503), dan tenggat tinggal ±3–4 hari. Jalur ini hanya dibuka bila pemicu di §5 terpenuhi.
3. **Kirim pertanyaan ke organizer hari ini** (teks siap pakai di §7). Jawabannya menentukan apakah langkah 1 cukup atau langkah 2 perlu dibuka.

Prinsip yang dijaga: jalur utama Token Factory + ManualNote tidak boleh berubah saat flag OFF; tidak ada fallback provider diam-diam; klaim di pitch hanya berdasarkan trace nyata.

---

## 2. Tabel keputusan

| # | Kriteria | Bukti (14 Okt 2026) | Sumber | Status |
|---|---|---|---|---|
| K1 | Google prize ada untuk ACT III | Halaman event: "$5,000 in prizes from Google"; "Google and Evolus technologies are optional. Teams that use an eligible partner technology can also compete for that partner's prize." | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii | OK |
| K2 | Aturan Google prize tertulis (model, hardware, bukti) | **Tidak ditemukan.** Halaman event dan halaman live tidak menyebut Gemma, DeepMind, model, hardware, maupun bukti. Pencarian web juga nihil. Pengumuman partner 14 Okt yang dikutip CB-035 tidak ditemukan di web publik (kemungkinan Discord) | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/live ; pencarian web | **VERIFY** |
| K3 | Preseden: cara Google prize dinilai di ACT II | ACT II (Juli 2026) punya "$6,000 in prizes for the best use of Gemma models" dengan 3 sub-prize, a.l. "Best Use of Gemma via Fireworks" ($1.000, Gemma via API terkelola Fireworks dihitung) dan "Best AMD-Hosted Gemma Project" ($2.000, Gemma di-host di AMD). Gemma "available to participants through AMD Developer Cloud and Fireworks AI" | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii | OK (preseden, bukan aturan ACT III) |
| K4 | Gemma lewat Token Factory (terkelola) dihitung untuk Google prize | Tidak ada pernyataan tertulis. Interpretasi tim: Token Factory adalah "approved AMD powered infrastructure provided during the event" dan menyajikan Gemma-4-31B-IT, sehingga analog dengan "AMD-hosted Gemma" di ACT II. Tetap harus ditanyakan | AMD_SETUP §9.1 V3; K3 | **VERIFY** |
| K5 | Gemma benar-benar sudah berjalan di jalur CareBridge | Test bench lokal: Token Factory `Gemma-4-31B-IT` (bukan model reasoning), chat valid 5/5 (±5,5 dtk) di satu run; 0/5 dan 2/5 di run lain karena 429/503 `no_available_workers`/timeout; Care Passport golden 3/4 (12–20 dtk). `AMD_TIMEOUT_MS` bawaan dinaikkan ke 30000 | TESTBENCH.md; commit 3228c35 | OK untuk "berjalan", **RISK** untuk keandalan |
| K6 | Bukti hardware AMD/ROCm dari gateway terkelola | Gateway hanya mengembalikan JSON OpenAI-compatible. Tidak ada `rocminfo`/`rocm-smi`, versi ROCm, atau GPU id. Katalog Token Factory (situs China) menyebut "served with vLLM on AMD Radeon PRO W7900" tetapi untuk endpoint event belum terlihat | AMD_SETUP §9.1 V7–V9 | **RISK** (DoD CB-035 butir 1 tidak terpenuhi lewat jalur ini) |
| K7 | Lisensi Gemma 4 | Kartu model `google/gemma-4-31B-it`: "License: apache-2.0"; halaman Gemma Terms menyatakan untuk Gemma 4 berlaku "Gemma 4 license", yang menaut ke teks Apache License 2.0 (Last updated 2026-04-01). Apache 2.0: boleh komersial, wajib pertahankan NOTICE, tidak memberi hak merek | https://huggingface.co/google/gemma-4-31b-it ; https://ai.google.dev/gemma/terms ; https://ai.google.dev/gemma/apache_2 | OK |
| K8 | Gemma Prohibited Use Policy vs aplikasi kesehatan mental | Berlaku jelas untuk Gemma ≤3 (Terms §3.2); untuk Gemma 4 halaman Apache 2.0 hanya menautkan PUP tanpa menyatakan berlaku → **VERIFY**, tetapi tim mematuhinya apa pun jawabannya. Klausul relevan (PUP, last modified 21 Feb 2024): §2.2/§3.6 "unlicensed practice of any profession ... medical/health"; §3.3 "Misleading claims of expertise ... (e.g. health ...)"; §3.4 "Making automated decisions in domains that affect ... well-being (e.g. ... healthcare ...)"; §3.1 misrepresentasi output sebagai buatan manusia. Mitigasi sudah ada: no diagnosis (AI_POLICY), human review/approve wajib, label "Diproses di AMD"/AI, data demo sintetis, pengguna 18+ | https://ai.google.dev/gemma/prohibited_use_policy ; AI_POLICY.md §5; AMD_01 §4 | OK (desain patuh), **VERIFY** (keberlakuan ke Gemma 4) |
| K9 | vLLM mendukung Gemma 4 | Tabel supported models vLLM memuat `Gemma4ForCausalLM`, `Gemma4ForConditionalGeneration` (LoRA ✓, PP ✓), `Gemma4UnifiedForConditionalGeneration` (contoh `google/gemma-4-12B-it`). Kartu HF: `vllm serve "google/gemma-4-31B-it"` | https://docs.vllm.ai/en/latest/models/supported_models.html ; https://huggingface.co/google/gemma-4-31b-it | OK |
| K10 | vLLM + ROCm di MI300X untuk Gemma 4 | AMD mengumumkan "Day 0 Support for Gemma 4" (2 Apr 2026) dengan vLLM/SGLang/ROCm untuk Instinct & Radeon (halaman amd.com timeout saat diakses; dibaca lewat snippet dan ringkasan pihak ketiga). Image resmi terbaru ROCm docs: `rocm/vllm:rocm10.1.0_ubuntu24.04_py3.14-pytorch_2.13.0_vllm-0.29.0` (MI300X gfx942 didukung). Pihak ketiga menyebut image `vllm/vllm-openai-rocm:gemma4` dan keharusan `--attention-backend TRITON_ATTN` untuk multimodal | https://www.amd.com/en/developer/resources/technical-articles/2026/day-0-support-for-gemma-4-on-amd-processors-and-gpus.html ; https://rocm.docs.amd.com/en/latest/how-to/rocm-for-ai/inference/benchmark-docker/vllm.html ; https://www.mayhemcode.com/2026/04/gemma-4-amd-gpu-support-vllm-sglang.html | OK (dukungan), **VERIFY** (tag image & flag persis belum diuji tim) |
| K11 | Ukuran model vs 1× MI300X | Gemma 4 31B dense bf16 ≈ 62 GB bobot; MI300X 192 GB HBM → muat di 1 GPU, dengan ruang KV cache. Varian 12B/26B-A4B lebih ringan bila latensi jadi masalah | Kartu HF (30,7B param, BF16); spesifikasi MI300X (pengetahuan umum, tidak di-fetch) | OK (perhitungan), **VERIFY** (belum diuji) |
| K12 | Akses AMD Developer Cloud: kredit, approval, biaya | Harga MI300X: $2,59/GPU-jam (DigitalOcean, "Last verified 3 Jun 2025") atau $1,99/jam (artikel lablab, 17 Apr 2026). Artikel lablab: kredit $100 diterapkan otomatis **tetapi "Add a payment method (required even with credits)"**; "No waiting list". Kit tim: approval ±2–3 hari kerja, kedaluwarsa 30 hari (PERLU CEK). Halaman amd.com cloud-access timeout saat diakses. Status kredit/kartu tim: belum diketahui | https://docs.digitalocean.com/products/amd/details/pricing/ ; https://lablab.ai/ai-articles/from-zero-to-ai-builder-amd-developer-program ; AMD_SETUP §1 | **RISK** |
| K13 | Tenggat submission | Halaman event: "Online Build 12-18 October 2026"; halaman live: "Online Build: 12-17 October 2026", countdown 00:00:00, tanpa jam/zona waktu. AMD_01: 18 Okt 15:00 UTC (22:00 WIB) dari kit, **PERLU CEK**. Acuan kerja tim: build selesai 17 Okt | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii ; .../live ; AMD_01 §1 | **VERIFY** |
| K14 | Prasyarat internal CB-035: P0 stabil | CB-035 adalah P1 "hanya setelah P0 CareBridge Token Factory stabil". Bukti K5: Token Factory masih 0/5–5/5 antar run → P0 belum stabil | CB-035 §Priority; TESTBENCH.md | **RISK** |
| K15 | Dampak ke jalur utama bila Gemma gagal | Desain §11.1: flag server-side, default OFF, tidak ada silent fallback; Token Factory + ManualNote tetap jalan. Belum ada kode flag → harus dibuktikan dengan tes rollback | CAREBRIDGE_STRUCTURE_MERMAID §11.1; AI_POLICY §5 | OK (desain), **VERIFY** (tes belum ada) |

---

## 3. Alasan rekomendasi

**Mengapa tidak No-Go total.** Gemma-4-31B-IT **sudah** menjadi engine Care Passport di test bench (K5) dan lisensinya Apache 2.0 (K7). Menjadikan ini eksplisit (flag + provenance "model: Gemma 4" + trace) hampir tanpa biaya dan tidak mengganggu jalur utama. Jika organizer menjawab bahwa Gemma lewat Token Factory dihitung (K4), tim sudah punya bukti nyata; jika tidak dihitung, tidak ada yang hilang kecuali ±1 hari kerja. Preseden ACT II (K3) menunjukkan Google pernah menghargai Gemma lewat API terkelola (Fireworks) **dan** Gemma yang di-host AMD, jadi peluangnya bukan nol.

**Mengapa tidak Go penuh (VM MI300X + vLLM sendiri).** Empat hal bertumpuk: (a) aturan ACT III tidak tertulis, jadi investasi VM bisa sia-sia (K2); (b) kredit butuh kartu pembayaran dan status klaim tim tidak diketahui, sementara jam instance berjalan terus bila lupa destroy (K12); (c) P0 belum stabil dan ini syarat eksplisit CB-035 (K14); (d) tenggat ±3–4 hari dan satu orang AMD/AI Engineer juga memegang P0 (K13). Risiko terburuk: tim sibuk mengejar bukti `rocm-smi` sementara demo utama Track 2 ikut jatuh.

**Apa yang bisa diklaim dengan jujur sekarang.** "Care Passport diproses oleh Gemma 4 31B IT (Google DeepMind, Apache 2.0) yang disajikan AMD Token Factory, infrastruktur AMD yang disediakan event; latensi dan tingkat sukses sesuai trace X." **Tidak** boleh diklaim: "berjalan di GPU AMD + ROCm yang kami verifikasi" (K6), "eligible untuk Google prize" (K2/K4).

---

## 4. Estimasi usaha dan risiko

| Opsi | Usaha | Biaya | Risiko utama | Keputusan |
|---|---|---|---|---|
| **A. Go-Lite**: flag + provider Gemma (Token Factory) + rollback test + bukti trace | 0,5–1 hari, 1 orang | $0 | Token Factory 429/503 (K5); bukti hardware tidak ada (K6) | **GO** |
| **B. VM MI300X + vLLM Gemma 4** (31B atau 12B) | 1–2 hari + menunggu kredit/kartu; 2–3 jam setup bila image dan model unduh lancar (±62 GB) | $2–2,6/jam; $100 kredit ≈ 40–50 jam | Approval/kartu (K12); image/flag belum diuji (K10); menyedot waktu P0 (K14); endpoint harus bisa dijangkau Vercel dengan aman (§11.1) | **NO-GO final** (keputusan tim 14 Okt: tanpa kredit AMD) |
| C. Tidak melakukan apa pun | 0 | $0 | Kehilangan peluang $5.000 yang murah dicoba | tidak dipilih |

---

## 5. Apa yang akan mengubah keputusan

~~Dari **Go-Lite → Go penuh (opsi B)**~~ — **tidak berlaku lagi**: tim memutuskan tidak memakai kredit AMD Developer Cloud (14 Okt 2026). Syarat lama dibiarkan untuk jejak keputusan:
1. Organizer menjawab tertulis bahwa Gemma via Token Factory **tidak** dihitung, tetapi Gemma yang di-serve sendiri di AMD Developer Cloud dihitung (K4).
2. Akun AMD Developer Cloud tim sudah bisa membuat droplet MI300X (kredit aktif atau kartu terpasang) (K12).
3. P0 lulus release gate: Token Factory ≥4/5 chat dan ≥4/4 golden passport dalam 2 run berturut (K14).
4. Ada satu orang yang bisa dialokasikan penuh tanpa mengambil dari P0.

Dari **Go-Lite → No-Go total** jika salah satu terjadi:
- Organizer menjawab Google prize tidak terbuka untuk Track 2, atau mensyaratkan bukti yang mustahil dalam sisa waktu.
- Rerun test bench Gemma-4-31B-IT tetap <4/5 setelah backoff/retry, sehingga flag tidak layak dinyalakan di demo.
- Tenggat ternyata 17 Okt (K13) dan P0 belum selesai pada 16 Okt.

---

## 6. Outline tugas lanjutan (jika Go-Lite disetujui)

Satu issue Jira, judul: **"CB-035a: Feature flag CAREBRIDGE_GEMMA_ENABLED (default OFF) + Gemma provider + rollback test"**. Tidak mengubah `CarePassportResult`, lima state, urutan crisis gate → consent → PII redaction → inference → validator.

1. **Konfigurasi** (`.env.example`, dokumentasi AMD_SETUP §9/AI_POLICY §5): `CAREBRIDGE_GEMMA_ENABLED=false`, `GEMMA_AMD_BASE_URL`, `GEMMA_AMD_API_KEY`, `GEMMA_AMD_MODEL` (nilai awal: endpoint Token Factory + `Gemma-4-31B-IT`), `GEMMA_AMD_TIMEOUT_MS` (default ikut 30000). Tanpa key di repo.
2. **Provider**: `createGemmaProvider()` = pembungkus tipis `createAmdProvider` dengan env `GEMMA_AMD_*`, marker `isAmd: true` + `engine: 'gemma'`/model id di provenance. Pemilihan provider terjadi di server (`carePassportPipeline`, `openingLinesPipeline`) **hanya** bila flag `true`; tidak ada input base URL dari browser.
3. **Tanpa fallback diam-diam**: bila Gemma gagal saat flag ON → `PROVIDER_UNAVAILABLE`/ManualNote dengan kode warning, bukan pindah ke `AMD_*`.
4. **UI/provenance**: label "Diproses di AMD · Gemma 4" hanya saat provenance menyatakan engine Gemma; README/pitch menyebut model id dan tanggal trace.
5. **Tes**:
   - Unit: flag OFF → `createAmdProvider` dipanggil, Gemma tidak dibangun; flag ON → Gemma dipanggil; krisis/consent ditolak → 0 panggilan provider di kedua mode.
   - Rollback: jalankan golden A–E + faults (`scripts/testbench/faults.sh`) dua kali, flag OFF dan ON, bandingkan state dan warning codes; OFF harus identik dengan baseline 3228c35.
   - Secret: tidak ada `Bearer`/key/teks pengguna di log (reuse tes yang ada).
6. **Bukti untuk pitch**: `*.summary.md` test bench (model, latensi p50/p95, N, success/parse rate), tanpa prompt/teks pengguna; simpan tanggal dan base URL tanpa key.
7. **Dokumen**: perbarui CB-035 checklist; status Google prize tetap **VERIFY** sampai ada jawaban tertulis; lampirkan jawaban organizer di dokumen ini (§8).

Estimasi: 0,5–1 hari. Pemilik: AMD/AI Engineer; reviewer: QA/Safety.

Jika kelak opsi B dibuka, tambahkan sub-task: droplet MI300X (image vLLM/ROCm, §2 AMD_SETUP), `vllm serve google/gemma-4-31B-it` (atau 12B) di loopback + reverse proxy ber-auth/HTTPS agar terjangkau Vercel, simpan output `rocminfo`, `rocm-smi`, `GET /v1/models`, versi image, tanggal; **destroy** instance setiap selesai.

---

## 7. Pertanyaan untuk organizer

Kirim di Discord event (channel pertanyaan/organizer) atau email lablab; catat jawaban dan tanggalnya di §8.

```
Hi organizers, quick eligibility question about the Google partner prize ($5,000) at AMD Developer Hackathon: ACT III.

Our Track 2 (Health & Wellbeing) project runs its core inference on Gemma 4 31B IT served through the AMD Token Factory gateway (the managed, OpenAI-compatible endpoint provided for this event via notebooks.amd.com/tokenfactory). We are not self-hosting Gemma on an AMD Developer Cloud VM at the moment.

1. Does Gemma served via AMD Token Factory count as an eligible use of Google technology for the Google prize, or must Gemma be self-hosted (e.g. vLLM on an MI300X in AMD Developer Cloud)?
2. What evidence do you expect in the submission for the Google prize: model ID in the README/video, request/response traces, rocm-smi / ROCm version output from the serving machine, something else?
3. Are there written rules for the Google prize for ACT III (eligible Gemma versions, tracks, judging criteria)? We could only find the "$5,000 in prizes from Google" line on the event page.
4. Could you confirm the exact submission deadline and time zone? The event page says Online Build 12-18 October, the live page says 12-17 October.

Thank you!
Team Dengar.in (CareBridge, Track 2)
```

---

## 8. Jawaban organizer (diisi saat ada)

| Tanggal | Kanal | Pertanyaan | Jawaban (kutip) | Dampak ke keputusan |
|---|---|---|---|---|
| — | — | — | belum ada | — |

---

## 9. Sumber (diakses 14 Oktober 2026)

| Kode | URL | Catatan |
|---|---|---|
| S1 | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii | Halaman event ACT III: Google $5.000, "eligible partner technology", FAQ Token Factory, Online Build 12–18 Okt |
| S2 | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/live | Live page: Online Build 12–17 Okt, countdown nol, tanpa deadline, tanpa Gemma |
| S3 | https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii | Preseden ACT II: Gemma prizes $6.000, "Best Use of Gemma via Fireworks", "Best AMD-Hosted Gemma Project" |
| S4 | https://huggingface.co/google/gemma-4-31b-it | Kartu model: 30,7B, Apache 2.0, 256K ctx, thinking toggle, `vllm serve` |
| S5 | https://ai.google.dev/gemma/terms | Gemma Terms (last modified 1 Apr 2026); Gemma 4 → "Gemma 4 license" |
| S6 | https://ai.google.dev/gemma/apache_2 | Teks Apache License 2.0 untuk Gemma 4 (last updated 2026-04-01) |
| S7 | https://ai.google.dev/gemma/prohibited_use_policy | PUP (last modified 21 Feb 2024): klausul profesi medis, klaim keahlian, automated decisions, provenance |
| S8 | https://docs.vllm.ai/en/latest/models/supported_models.html | `Gemma4ForCausalLM`, `Gemma4ForConditionalGeneration`, `Gemma4UnifiedForConditionalGeneration` |
| S9 | https://www.amd.com/en/developer/resources/technical-articles/2026/day-0-support-for-gemma-4-on-amd-processors-and-gpus.html | AMD Day-0 Gemma 4 (2 Apr 2026). **Halaman timeout saat diakses**; isi dari snippet pencarian dan ringkasan pihak ketiga (S10, S11) → VERIFY detail |
| S10 | https://letsdatascience.com/news/amd-adds-gemma-4-support-across-hardware-92bcfd81 | Ringkasan pihak ketiga (4 Apr 2026): vLLM/SGLang/ROCm, MI300-series, 2B–31B |
| S11 | https://www.mayhemcode.com/2026/04/gemma-4-amd-gpu-support-vllm-sglang.html | Pihak ketiga (5 Apr 2026): `vllm/vllm-openai-rocm:gemma4`, `--attention-backend TRITON_ATTN` → VERIFY |
| S12 | https://rocm.docs.amd.com/en/latest/how-to/rocm-for-ai/inference/benchmark-docker/vllm.html | Image `rocm/vllm:rocm10.1.0_ubuntu24.04_py3.14-pytorch_2.13.0_vllm-0.29.0`, MI300X gfx942, flag docker |
| S13 | https://docs.digitalocean.com/products/amd/details/pricing/ | MI300X $2,59/GPU-jam ("Last verified 3 Jun 2025") |
| S14 | https://lablab.ai/ai-articles/from-zero-to-ai-builder-amd-developer-program | Artikel lablab (17 Apr 2026): $100 kredit, "Add a payment method (required even with credits)", $1,99/jam, "No waiting list" |
| S15 | https://www.amd.com/en/developer/resources/cloud-access.html | **Timeout saat diakses**; syarat kredit resmi (approval, kedaluwarsa) → VERIFY |
| L1 | docs/TESTBENCH.md, commit 3228c35 | Trace lokal Gemma-4-31B-IT via Token Factory, `AMD_TIMEOUT_MS` 30000 |
