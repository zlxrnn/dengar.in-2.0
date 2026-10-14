# Test bench lokal (Docker)

Menjalankan pipeline AI **asli** (orchestrator chat + Care Passport, termasuk
validator dan guardrail) terhadap beberapa model sekaligus, plus smoke test
container web. Dipakai untuk release gate (SCRUM-24) dan regresi (SCRUM-20).

## Pemetaan provider

| Peran di aplikasi | Slot env | Provider bench |
|---|---|---|
| Tier 1 chat | `DEEPSEEK_*` | DeepSeek langsung (`deepseek-flash`) |
| Second Brain (debiaser) | `OPENROUTER_*` + `OPENROUTER_BASE_URL` | OpenCode Zen (GLM) |
| Care Passport (Track 2) | `AMD_*` | TokenFactory (Gemma-4-31B-IT), OpenAI-compatible |

Matriks bench bawaan: `deepseek-flash`, OpenCode `nemotron-3.5-lightning-free`,
OpenCode `glm-5.3-flash`, TokenFactory `Gemma-4-31B-IT`. Model tanpa key/base URL dilewati (SKIP).

## Setup

Buat `.env.testbench` di root repo (sudah di-gitignore oleh pola `.env*`):

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-flash
OPENCODE_API_KEY=
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_NEMOTRON_MODEL=nemotron-3.5-lightning-free
OPENCODE_GLM_MODEL=glm-5.3-flash
TOKENFACTORY_API_KEY=
TOKENFACTORY_BASE_URL=https://developer.amd.com.cn/radeon/api/v1   # AMD Radeon Cloud Token Factory
TOKENFACTORY_MODEL=Gemma-4-31B-IT   # tanpa reasoning; Qwen3.8-* terlalu lambat (lihat catatan)
TOKENFACTORY_JSON_MODE=true
# Opsional
# TESTBENCH_DEBIASER_MODEL=glm-5.3-flash
# TOKENFACTORY_JSON_MODE=true
# BENCH_MODELS=deepseek:deepseek-flash,opencode:glm-5.3-flash,tokenfactory:Qwen3.8-Flash-Next
# BENCH_CHAT_TIMEOUT_MS=90000      # longgarkan batas 15/18 dtk produksi untuk mengukur latensi asli
# BENCH_PASSPORT_TIMEOUT_MS=90000
```

## Menjalankan

```bash
npm run testbench:up           # web (port 3000) + redis
npm run testbench              # bench: chat + passport + web smoke
npm run testbench -- chat      # hanya satu mode: chat | passport | web | all
npm run testbench:down
```

Laporan JSON per run ditulis ke `scripts/testbench/reports/` (gitignored,
berisi output model dari input sintetis), plus `*.summary.md` yang hanya berisi
metadata (model, case, expected/got, latensi, kode error) dan aman ditempel ke Jira.

### Uji gangguan Care Passport

```bash
bash scripts/testbench/faults.sh
```

Menyalakan satu container web per skenario (key salah, model salah, mock 429/503,
endpoint menggantung) lalu memanggil `POST /api/care-passport`. Kasus krisis dan
consent ditolak diarahkan ke mock yang menggantung dan mencatat request: bila
provider terpanggil, request itu muncul di log mock dan respons tertahan 12 dtk.

## Catatan

- Free tier OpenCode (`*-free`, mis. Nemotron) menolak panggilan di luar aplikasi
  OpenCode (HTTP 403). Model berbayar (GLM) butuh saldo Zen (HTTP 402 bila habis).
- Bench memanggil provider lewat adaptor DeepSeek/AMD yang generik, jadi pesan
  error menyebut "DeepSeek"/"AMD endpoint" walau gateway-nya lain; lihat kolom `model`.
- Qwen di TokenFactory adalah model reasoning. Dengan `max_tokens: 1024` (hardcoded
  di `amdProvider.ts`) seluruh kuota habis untuk reasoning dan konten kosong
  (`finish_reason=length`). `chat_template_kwargs: {enable_thinking: false}`
  menghilangkan reasoning, tapi satu Care Passport tetap ±26 dtk, dan chat ±26–30 dtk
  (di atas anggaran giliran 18 dtk).
- Gateway bench untuk TokenFactory adalah `https://developer.amd.com.cn/radeon/api/v1`.
  Belum diverifikasi apakah ini endpoint yang sama dengan yang dipakai SCRUM-13
  (AMD_SETUP §9.2 A2).
- Bawaan `AMD_TIMEOUT_MS` dinaikkan dari 12000 ke 30000 (14 Okt): dengan 12000,
  Gemma-4-31B-IT sering timeout di Care Passport (12–20 dtk per passport).
- Postgres tidak disertakan: tanpa `DATABASE_URL` aplikasi memakai penyimpanan in-memory.
