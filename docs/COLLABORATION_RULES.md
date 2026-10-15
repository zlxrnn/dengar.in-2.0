# Aturan Kolaborasi: Push, PR, dan Kepemilikan File

Berlaku untuk seluruh tim Dengar.in 2.0 mulai 14 Okt 2026. Tujuannya satu: **tidak ada dua orang
mengubah file yang sama di waktu yang sama**, dan setiap perubahan bisa dilacak ke tiket Jira.
Pemetaan wilayah mengikuti epic Jira (proyek `SCRUM`).

## 1. Aturan push dan PR

1. **Tidak ada push langsung ke `main`.** Semua perubahan lewat Pull Request. Satu-satunya
   pengecualian adalah commit yang memperkenalkan dokumen ini.
2. **Satu tiket = satu branch = satu PR.** Nama branch: `<github-username>/SCRUM-<nomor>-<slug>`,
   contoh `YanIanZ/SCRUM-31-testbench`.
3. **Judul PR dan commit memuat key Jira**, contoh `feat(carebridge): SCRUM-35 CTA setelah consent guard`.
   Format pesan commit mengikuti Conventional Commits yang sudah dipakai repo (`feat`, `fix`, `docs`, `chore`, `test`, `style`).
4. **Ubah hanya file di wilayahmu** (§2). Bila perlu mengubah file milik orang lain:
   - perubahan kecil (≤ 20 baris, tanpa mengubah perilaku): boleh di PR-mu, **wajib approval pemilik file**;
   - perubahan besar: minta pemilik membuat tiket/PR sendiri, atau sepakati di komentar tiket Jira dulu.
5. **File bersama** (§3) hanya boleh diubah dalam PR kecil yang khusus untuk perubahan itu, dengan
   approval Release Owner (Iqbal) **dan** pemilik fitur yang terdampak.
6. **Minimal 1 approval** sebelum merge; merge dilakukan oleh penulis PR setelah approve, dengan *squash merge*.
7. **Sebelum minta review:** rebase ke `main` terbaru, `npm run test` lulus (atau sebutkan test yang
   relevan dan hasilnya), sertakan bukti QA (screenshot/log) sesuai kriteria selesai tiket.
8. **Dilarang:** force-push ke `main`, commit secret/API key (`.env*` sudah di-gitignore), commit data
   pengguna nyata, atau laporan test bench (`scripts/testbench/reports/`).
9. **Konflik:** yang terakhir merge wajib menyelesaikan konflik; bila konflik menyentuh wilayah orang
   lain, minta pemiliknya ikut review.
10. **Aturan keselamatan tidak bisa ditawar:** perubahan yang menyentuh crisis gate, consent, redaksi PII,
    atau urutan pipeline CareBridge (`docs/CAREBRIDGE_SAFETY_POLICY.md` §1) wajib approval Safety Owner (Immanuel).

## 2. Wilayah per orang

| Orang (GitHub) | Epic Jira | Boleh mengubah |
|---|---|---|
| **I Wayan Bagus Arya Darma Wiguna** (`@YanIanZ`) | SCRUM-5 CareBridge, SCRUM-9 Core Wellbeing, SCRUM-24 Release gate | `apps/web/src/app/care-passport/`, `apps/web/src/components/carePassport/`, `apps/web/src/lib/carePassport*.ts`, `apps/web/src/lib/api/carePassport*.ts`, `apps/web/src/lib/api/openingLinesHandler.ts`, `apps/web/src/app/api/care-passport/`, `services/orchestrator/src/carePassportPipeline.ts`, `services/orchestrator/src/openingLinesPipeline.ts`, `packages/prompts/src/carePassport.ts`, `packages/prompts/src/openingLines.ts`, `tests/carebridge/` (kecuali `amdProvider.test.mjs`); halaman Core Wellbeing: `apps/web/src/app/{chat,checkin,journal,mission,resources,dashboard,perjalanan,assessment,report}/`, `apps/web/src/lib/{chatProgress,gamification,wellbeingTimeline,calendar,storage}.ts`, `apps/web/src/lib/api/{chatHandler,chatHistory,aiCache}.ts`, `apps/web/src/app/api/{chat,report}/`, `tests/{chat,gamification,assessment,session,api}/`; test bench: `scripts/testbench/`, `docker/testbench/`, `docker-compose.testbench.yml`, `docs/TESTBENCH.md`; dataset CareBridge: `proto/carebridge/`, `scripts/carebridge/`, `tests/carebridge/dataset/`, `docs/CAREBRIDGE_DATASET.md`, `docs/CAREBRIDGE_KNOWLEDGE_BASE.md`; dokumen `docs/CAREBRIDGE_ARCHITECTURE.md`, `docs/CAREBRIDGE_STRUCTURE_MERMAID.md`, `docs/CB-035_GOOGLE_DEEPMIND_GEMMA_AMD.md` |
| **Bryan Christian Shine Mokolomban** | SCRUM-6 AMD inference | `services/orchestrator/src/providers/`, `services/orchestrator/src/orchestrator.ts`, `services/orchestrator/src/debiaser/`, `services/orchestrator/src/fallback/`, `services/orchestrator/src/guardrails/`, `tests/orchestrator/`, `tests/carebridge/amdProvider.test.mjs`, `docs/AMD_SETUP.md`, `docs/AI_POLICY.md` |
| **Immanuel Justin Elnathan** | SCRUM-7 Safety, SCRUM-8 Privacy, SCRUM-10 Community | `services/crisis-engine/`, `services/validator/`, `services/auth/`, `services/persistence/`, `supabase/`, `apps/web/src/app/{crisis,consent,recovery,forum}/`, `apps/web/src/app/api/{forum,admin,sync}/`, `apps/web/src/lib/{consent,crisisGuard,useConsentGuard,useCrisisGuard}.ts`, `apps/web/src/lib/crypto/`, `apps/web/src/lib/api/{crisisGate,adminSession,syncAuth,threadAlias,forum*,replySchema,repositories,publicWarnings,rateLimit,requestLimits}.ts`, `apps/web/src/components/{InlineCrisisCard,SupportPathwayCard,ConsentPending}.tsx`, `tests/{crisis,validator,security,forum,crypto,auth,persistence,persistence-pg}/`, `docs/{SAFETY,CRISIS_CLASSIFICATION,CAREBRIDGE_SAFETY_POLICY,M01_RATE_LIMITING,RECOVERY_MIGRATION}.md` |
| **Syafa Raditya Effendi** | SCRUM-11 Voice, a11y, i18n | `apps/web/src/app/ruang-ngobrol/`, `apps/web/src/i18n/`, `apps/web/src/components/ui/`, `apps/web/src/components/{SkipLink,Footer,NotFoundContent}.tsx`, `apps/web/src/lib/{browserSpeech,voiceRoom}.ts`, `apps/web/src/lib/api/geminiTts.ts`, `tests/voice/`, `docs/{VOICE_ACCESSIBILITY,VOICE_AUDITION,RUANG_NGOBROL,UX_FLOW,PRD-DESIGN}.md` |
| **Iqbal Dovandra** (`@iqbalscript`) | SCRUM-12 Release (Release Owner) | file bersama di §3, `apps/web/Dockerfile`, `apps/web/next.config.js`, `apps/web/cache-handler.mjs`, `apps/web/src/lib/redis.ts`, `apps/web/src/app/api/{health,redis-test}/`, `tests/{infra,redis}/`, `scripts/` (kecuali `scripts/testbench/`), `.github/`, `docs/{AMD_01_SCOPE_DAN_SYARAT,AMD_TRACK2_DEVELOPMENT_PLAN,AMD_TRACK2_TASKS,DEMO_SCRIPT,REDIS*,GAP_AUDIT_*}.md` |
| **Raditya Alvien Nugraha** | SCRUM-27/28/29 Dokumentasi | `README.md`, `docs/{PRD,PROJECT_CONTEXT,API_SPEC,SUBMISSION_COPY,Scriptwrite,SCRIPTWRITE_CHANGELOG,CAREBRIDGE_EVAL_RUBRIC}.md`, `docs/research/`, `docs/drafts/` |

Catatan:
- `docs/CAREBRIDGE_EVAL_RUBRIC.md`: isinya diubah oleh pemilik fitur CareBridge (YanIanZ) atas
  persetujuan Safety Owner; Raditya hanya merapikan bahasa/format.
- Tiket yang di-assign ke seseorang tetapi berada di epic orang lain (mis. SCRUM-23 voice milik YanIanZ
  di epic Syafa) mengikuti aturan §1.4: wajib approval pemilik wilayah.

## 3. File bersama (approval Release Owner + pemilik fitur terdampak)

`package.json`, `package-lock.json`, `apps/web/package.json`, `tsconfig.base.json`, `.env.example`,
`.gitignore`, `.dockerignore`, `eslint.services.config.mjs`, `apps/web/src/app/layout.tsx`,
`apps/web/src/app/page.tsx` (landing), `apps/web/src/app/globals.css`, `apps/web/src/components/Navbar.tsx`,
`packages/types/`, `packages/config/`, `packages/prompts/src/index.ts`, `services/*/package.json`,
`docs/COLLABORATION_RULES.md` (dokumen ini).

Menambah variabel env baru: tambahkan di `.env.example` pada PR yang sama (dijaga test
`tests/infra/envExampleParity.test.mjs`) dan sebutkan di deskripsi PR.

## 4. File yang belum terpetakan

File atau folder baru mengikuti wilayah folder induknya. Bila tidak jelas, tanyakan di tiket Jira
sebelum membuat PR, lalu tambahkan pemetaannya ke dokumen ini (lewat PR file bersama).

## 5. Penegakan

- `.github/CODEOWNERS` meminta review otomatis dari pemilik wilayah. Handle GitHub yang belum
  diketahui ditandai `TODO` dan harus dilengkapi oleh pemilik masing-masing.
- Pemilik repo disarankan mengaktifkan *branch protection* pada `main`: wajib PR, minimal 1 approval,
  wajib review Code Owners, dan larang force-push.
