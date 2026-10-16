# Dengar.in CareBridge — Backlog AMD Track 2

Tanggal: 13 Oktober 2026. Sumber: [development plan](AMD_TRACK2_DEVELOPMENT_PLAN.md).

Semua task berstatus **TODO**. Dokumen ini membuat backlog baru; belum menjalankan implementasi. ID task stabil untuk pembagian kerja dan pelacakan PR. Dependensi berarti task sebelumnya harus memenuhi kriteria selesai. Jadwal mengikuti konfirmasi deadline portal, bukan tanggal asumsi.

## P0 — Alur utama dan syarat demo

| ID | Task | Penanggung jawab | Dependensi | Kriteria selesai |
|---|---|---|---|---|
| AMD-01 | Konfirmasi scope CareBridge dan syarat hackathon | Product/Pitch | — | Scope 18+, data demo sintetis, larangan diagnosis/resep, batas human handoff, deadline/timezone, lisensi, dan syarat penggunaan AMD dicatat dengan sumber serta tanggal verifikasi. Bedakan cakupan ini dari produk lama 15–54. |
| AMD-02 | Siapkan endpoint AMD dan uji kapabilitas | AI/AMD | AMD-01 | Endpoint/model dari workspace resmi; satu request berhasil; dukungan JSON, timeout, dan format error dicatat. Kredensial hanya server-side, tidak masuk repo/log. |
| AMD-03 | Tetapkan kontrak Care Passport dan state API | Backend + AI/AMD | AMD-01 | Schema version 1 mencakup evidence, unknowns, reviewStatus, dan lima result state pada plan. Aturan validasi source quote terhadap input tersanitasi dan invalid-output handling terdokumentasi. |
| AMD-04 | Buat fixture dan rubrik evaluasi sintetis | Safety/QA | AMD-03 | Kasus A–E tersedia, diperluas menjadi 20 skenario atribusi; expected state/field jelas; tidak ada data pasien asli atau detail krisis sensasional pada demo publik. |
| AMD-05 | Tentukan dan implementasikan kebijakan safety CareBridge | Safety/QA + Backend | AMD-03, AMD-04 | Crisis gate mendahului AI/cache; kasus imminent-risk dan urgent-help menghentikan AI normal. Kebijakan high distress eksplisit; AI hanya dapat mengeskalasi. Regression membuktikan tidak ada downgrade dan ordinary provider tidak dipanggil pada jalur krisis. |
| AMD-06 | Implementasikan consent dan minimisasi data sebelum inference | Backend + Frontend | AMD-03, AMD-04 | Opt-in AI terpisah dari sharing; deteksi PII, preview redaksi/koreksi sebelum kirim; alur tetap aman jika consent ditolak. Intake sensitif tidak memakai output cache secara default; log/metric bebas plaintext identifier; retention/deletion policy dijelaskan. |
| AMD-07 | Implementasikan adapter dan routing AMD | AI/AMD | AMD-02, AMD-03 | Adapter mengikuti LLMProvider; extraction dan pertanyaan konsultasi memakai AMD. Timeout, malformed JSON, dan outage teruji; provenance AMD/fallback akurat; fallback tidak mengaku menghasilkan ringkasan AI. |
| AMD-08 | Implementasikan grounding dan validator Care Passport | Backend + AI/AMD | AMD-03, AMD-04, AMD-07 | Setiap fakta punya evidence yang cocok dengan input tersanitasi atau konfirmasi pengguna; fakta tanpa bukti dibuang/unknown. Tidak ada confidence persentase buatan, diagnosis, atau arahan medis terlarang. Kasus samar meminta maksimal satu klarifikasi terarah. |
| AMD-09 | Rakit API intake CareBridge | Backend | AMD-05, AMD-06, AMD-08 | Urutan consent → safety → minimisasi → inference → validasi terjaga; lima state API dapat direproduksi. Error aman, retry tersedia, telemetry hanya metadata yang diperlukan. |
| AMD-10 | Bangun intake dan halaman /care-passport | Frontend | AMD-09 | Pengguna dewasa dapat memasukkan cerita, membaca sumber/unknowns, mengoreksi dan menyetujui draft. Urgent-help selalu mudah diakses; provider unavailable dan kebutuhan klarifikasi tampil jelas; layout mobile dan keyboard berfungsi. |
| AMD-11 | Tambahkan ekspor lokal dengan persetujuan pengguna | Frontend + Backend | AMD-10 | Draft bisa ditinjau sebelum unduh; ekspor perlu tindakan afirmatif terpisah; memuat disclaimer dan data yang sudah disetujui, tanpa identifier buatan model. Tidak ada pengiriman otomatis ke pihak ketiga. |
| AMD-12 | Buat /support-options dan /review-demo sintetis | Frontend + Safety/QA | AMD-05, AMD-10 | Sumber bantuan resmi punya tautan/tanggal verifikasi; ketersediaan layanan tidak dijanjikan. Panel demo berlabel data sintetis dan acknowledgment reviewer bisa diperagakan; tidak menerima intake nyata. Sharing nyata ditunda hingga partner dan kontrol akses tersedia. |
| AMD-13 | Jalankan evaluasi safety, privacy, dan aksesibilitas | Safety/QA + UX/Research | AMD-04, AMD-11, AMD-12 | Kasus A–E lulus; atribusi 20 skenario diaudit; failure injection, tidak bocornya PII, keyboard, screen reader, dan mobile diperiksa. Catat command/hasil serta keterbatasan; tidak ada kegagalan critical yang diketahui pada rilis demo. |
| AMD-14 | Ukur dampak dan performa AMD | UX/Research + AI/AMD | AMD-13 | Ukur waktu manual vs assisted dengan vignette sintetis dan tester dewasa yang menyetujui; completeness, unsupported claims, reliability, median/p95 latency dicatat beserta jumlah sampel/metode. Pisahkan hasil AMD, fallback, dan target. |
| AMD-15 | Siapkan deployment dan dokumentasi reproduksi | Backend + AI/AMD | AMD-13 | Hosted flow berjalan; README, .env.example tanpa secret, perintah run/test, dan deployment/container diperbarui. Audit atribusi serta file LICENSE sesuai ketentuan yang sudah dikonfirmasi; live AMD trace berhasil tanpa data sensitif. |
| AMD-16 | Finalisasi demo dan submission | Product/Pitch + UX/Research | AMD-14, AMD-15 | Demo ±3 menit memperlihatkan sumber/unknowns, review/ekspor, safety, redaksi, outage, dan AMD trace. Deck/video/copy memakai hasil nyata; sumber hotline dan cutoff portal diverifikasi ulang; readiness checklist pada plan dituntaskan. |

## P1 — Setelah P0 stabil

| ID | Task | Dependensi | Kriteria selesai |
|---|---|---|---|
| AMD-17 | Intake suara yang dapat diedit | AMD-10, AMD-13 | Transkrip bisa diedit sebelum submit; text fallback tersedia; notice menjelaskan pemrosesan audio sesuai implementasi browser/provider, tanpa janji on-device yang belum dibuktikan. |
| AMD-18 | Integrasi check-in, assessment, dan report | AMD-11, AMD-13 | Pengguna memilih data yang disertakan; evidence dan consent tetap terlacak; reuse storage mengikuti kebijakan retention/deletion, tanpa manajemen klinis otomatis. |

## P2 — Opsional, bukan penghambat submission

| ID | Task | Dependensi | Kriteria selesai |
|---|---|---|---|
| AMD-19 | Upload dokumen dengan redaksi/OCR | AMD-13, AMD-15 | Threat model dan kebijakan privasi disepakati; preview redaksi sebelum inference; ekstraksi tidak mengarang fakta dan punya sumber yang dapat ditinjau. |
| AMD-20 | Perluas direktori rujukan terverifikasi | AMD-12 | Entri mencantumkan sumber, tanggal verifikasi, dan batas informasi ketersediaan; tidak menjanjikan akses klinisi tanpa integrasi nyata. |

## Urutan pengambilan task

Mulai AMD-01. Setelah scope disepakati, AMD-02 dan AMD-03 dapat berjalan paralel; lanjutkan berdasarkan dependensi pada tabel. Jadwal 13–17 Oktober di plan adalah usulan sprint; 18 Oktober hanya buffer jika portal resmi mengizinkan.

Saat task selesai, ubah status melalui catatan berikut agar kriteria dan bukti mudah ditinjau:

| Task | Status | Bukti PR/commit atau dokumen | Verifikasi dan kendala |
|---|---|---|---|
| AMD-01 | Sebagian | [AMD_01_SCOPE_DAN_SYARAT.md](AMD_01_SCOPE_DAN_SYARAT.md) | Halaman resmi dicek 13 Okt 2026. Masih terbuka: tenggat persis (tidak lagi tampil di dashboard), aturan proyek yang sudah ada, terms MIT, status kredit AMD. |
| AMD-03 | Selesai (kode) | `packages/types` (CarePassport v1, 5 result state), `services/validator/src/carePassport.ts` | `npm run test:carebridge`. Kontrak belum ditinjau tim Backend. |
| AMD-04 | Selesai (mock) | `tests/carebridge/fixtures.mjs`, [rubrik](CAREBRIDGE_EVAL_RUBRIC.md) | Kasus A–E + 20 skenario atribusi lulus terhadap validator. Belum diuji ke model AMD sungguhan (AMD-13). |
| AMD-05 | Selesai | `services/orchestrator/src/carePassportPipeline.ts`, [kebijakan](CAREBRIDGE_SAFETY_POLICY.md), `packages/config/src/index.ts` | Urutan crisis gate dan escalation-only teruji. Kebijakan distres `high` ditetapkan definitif (Safety Owner disetujui): state dikunci ke `HUMAN_SUPPORT_RECOMMENDED`; alternatif "tahan draf" diputuskan tidak dipilih. Kontak darurat Yayasan Pulih tersinkronisasi antara engine dan config (15 Okt 2026). |
| AMD-06 | Selesai | `services/validator/src/piiRedactor.ts`, `apps/web/src/lib/api/carePassportHandler.ts`, `tests/carebridge/{piiRedactor,handler,selfHelpExport}.test.mjs`, `docs/{CAREBRIDGE_SAFETY_POLICY,CAREBRIDGE_ARCHITECTURE}.md` | Pratinjau redaksi per-segmen + `keepSoftPii` (soft-only), server-side re-redaction (klien tidak dipercaya), consent negatif `ai_consent_declined` dengan 0 panggilan provider, telemetry metadata-only tanpa teks mentah, serta kebijakan retensi/penghapusan tertulis. |
| AMD-07 | Sebagian | `services/orchestrator/src/providers/amdProvider.ts` | Adapter + probe teruji dengan server tiruan (25 test); jadi provider default pipeline. Butuh endpoint nyata (AMD-02). |
| AMD-08 | Selesai (kode) | `services/validator/src/carePassport.ts` | Grounding kutipan, tanpa persentase buatan, tanpa label diagnosis, maks. 1 klarifikasi. |
| AMD-09 | Selesai (mock) | `apps/web/src/lib/api/carePassportHandler.ts`, `apps/web/src/app/api/care-passport/**` | Urutan usia → crisis gate → redaksi ulang di server → pipeline teruji (`tests/carebridge/handler.test.mjs`, `route.test.mjs`). Smoke test HTTP 14 Okt: pratinjau, krisis, consent ditolak, AI tidak tersedia. |
| AMD-10 | Selesai | `apps/web/src/app/care-passport/page.tsx`, `apps/web/src/components/carePassport/**` | Lima state + pratinjau redaksi. QA browser, keyboard, screen reader, dan penskalaan teks 140% selesai diaudit dan diremediasi (lihat AMD-13). |
| AMD-11 | Selesai (kode) | `apps/web/src/lib/carePassportExport.ts` | Ekspor .md/.txt hanya setelah disetujui, tanpa kutipan mentah. |
| F-A Bukti Bertanggal | Selesai (mock) | `carePassportClient.ts`, `EvidencePicker.tsx` | Fitur orisinal dari [riset](research/RISET_FITUR_DAN_GAP_2026-10-13.md) §4. Fakta tertaut ke tanggal entri jurnal/check-in. |
| F-B Kalimat Pembuka | Selesai (mock) | `openingLinesPipeline.ts`, `OpeningLines.tsx`, `packages/config/src/helpDestinations.ts` | Fitur orisinal, riset §5. Checklist statis bersumber, kalimat AI grounded. |
| AMD-14 | Selesai | `scripts/eval-carebridge.mjs`, `scripts/probe-amd.mjs`, `scripts/lib/evalMetrics.mjs`, `docs/eval/` | Selesai sesuai kriteria yang ditugaskan: harness benchmark selesai dengan perintah reproduksi (`npm run eval:carebridge:*`), pemisahan ketat berkas mock vs live, pencatatan metrik n, latensi median/p95, completion, failure rate, dropped claims, 0 escaped unsupported claims, log teranonimisasi tanpa PII/kunci, serta disclaimer batasan performa. Baseline mock selesai (14 Okt 2026: n=23, 100% completion, 0% failure rate, 0 klaim lolos). Jalur live teruji dan siap dijalankan dengan endpoint AMD aktif. |
| AMD-12 | Selesai | `packages/config/src/supportOptions.ts`, `apps/web/src/app/support-options/**`, `apps/web/src/app/review-demo/**`, `apps/web/src/lib/reviewDemoData.ts`, `tests/carebridge/supportOptions.test.mjs`, `tests/carebridge/reviewDemo.test.mjs` | `/support-options`: 6 entri, masing-masing dengan sumber, tanggal cek, dan batas; tanpa janji ketersediaan. `/review-demo`: kasus sintetis A–E, tanpa kolom isian teks, tanpa fetch/penyimpanan, tanpa klaim integrasi klinis; hasilnya ditulis tangan, bukan keluaran model. 17 unit test lulus 100%, typecheck dan lint bersih. Sharing nyata ke partner tetap di luar cakupan. |
| AMD-13 | Selesai | `tests/carebridge/a11yAudit.test.mjs`, `tests/security/abuseChecks.test.mjs`, [Laporan A11y](eval/A11Y_AUDIT_REPORT_2026-10-16.md), [Threat Model](THREAT_MODEL.md), [Laporan Bug Keamanan](bugs/BUG_REPORT_2026-10-16_SECURITY_THREAT_MODEL.md), `apps/web/src/components/{Navbar,Footer,carePassport/**}.tsx` | Evaluasi safety, privacy, threat model (7 domain: prompts, storage, server logs, keys, forum abuse, export, provider disclosure), 14 uji abuse otomatis (`npm run test:security-abuse`), mitigasi PII, serta audit aksesibilitas (WCAG AA) tuntas 100%. Tiga temuan keamanan kritis dicatat ke Jira (SCRUM-47, SCRUM-48, SCRUM-49) dengan 100% data sintetis. |
| AMD-02, AMD-15 s.d. AMD-20 | TODO | — | AMD-02 menunggu endpoint AMD (cek juga jalur Token Factory, lihat [AMD_SETUP.md](AMD_SETUP.md)). |

Produksi dengan partner klinis, diagnosis/resep, serta outreach otomatis tidak termasuk backlog MVP. Integrasi partner memerlukan scope tersendiri untuk autentikasi staf, role-based access, consent sharing, audit log, retention/deletion, dan incident handling.
