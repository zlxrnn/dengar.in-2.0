# Kebijakan Keselamatan Care Passport (AMD Track 2)

Task: AMD-05. Implementasi: `services/orchestrator/src/carePassportPipeline.ts`. Test: `tests/carebridge/pipeline.test.mjs`.

**Status:** dokumen kebijakan definitif. Penanganan *high distress* (§3) adalah **kebijakan yang disetujui** — mekanisme penguncian state deterministik (`HUMAN_SUPPORT_RECOMMENDED` via `deterministic_high_distress`) sudah berjalan di produksi sejak 15 Okt 2026. Kriteria eskalasi model dan eskalasi berkutipan di §4, frasa darurat bahasa Inggris di §2, serta rule ide pasif di §3 adalah rekomendasi SCRUM-44 yang **disetujui Immanuel, dilaporkan YanIanZ 15 Okt 2026** (diimplementasikan 15 Okt 2026). Langkah self-help berbasis kartu dan rencana keselamatan statis di §4.3 adalah fitur SCRUM-45 yang **disetujui Immanuel, dilaporkan YanIanZ 15 Okt 2026** (diimplementasikan 15 Okt 2026).

## 1. Urutan wajib

Setiap permintaan Care Passport melewati urutan ini. Tidak ada langkah yang boleh dilewati atau ditukar.

1. **Gerbang krisis deterministik** (`@dengarin/crisis-engine`) dijalankan pada teks **mentah**, sebelum langkah lain.
2. **Persetujuan pemrosesan AI.** Persetujuan ini terpisah dari persetujuan berbagi atau ekspor.
3. **Inferensi** hanya pada teks yang **sudah disanitasi** (PII disamarkan). Provider tidak pernah menerima teks mentah.
4. **Validasi grounding** (`validateCarePassportDraft`) terhadap teks tersanitasi, lalu pemilihan state.

## 2. Jalur bantuan segera (`IMMEDIATE_HELP_SCREEN`)

- Dipicu oleh aturan krisis deterministik (`isCrisis`), **atau** permintaan eksplisit pengguna untuk bantuan darurat (`isUrgentHelpRequest`), misalnya "butuh bantuan darurat", "aku dalam bahaya", dan sejak SCRUM-44 juga bentuk Inggris "I need emergency/urgent/immediate help", "I am in danger", "I'm not safe", "connect me to emergency services". Daftar sengaja sempit: "I need help now with my thesis" tidak membuka layar darurat.
- Provider AI **tidak dipanggil sama sekali**, dan tidak ada Care Passport yang dibuat.
- Kontak darurat dewasa dari crisis engine ditampilkan.
- Gerbang ini berjalan **sebelum** cek persetujuan, sehingga pengguna yang menolak AI tetap mendapat jalur bantuan.

## 3. *High distress* (kebijakan definitif, disetujui Safety Owner)

Jika crisis engine memberi `severity: 'high'` tanpa `isCrisis`:
- Draf tetap boleh dibuat (jika pengguna setuju AI), tetapi state **dikunci** ke `HUMAN_SUPPORT_RECOMMENDED`, dengan peringatan `deterministic_high_distress`.
- Ini saran informatif untuk berbicara dengan profesional, **bukan** triase atau diagnosis.
- Alternatif yang ditimbang Safety/QA (menahan pembuatan draf sama sekali untuk kasus `high`) **diputuskan tidak dipilih** — draf tetap dibuat untuk membantu pengguna mengartikulasikan ceritanya kepada profesional.
- **Ide pasif tanpa rencana (SCRUM-44, disetujui Immanuel, dilaporkan YanIanZ 15 Okt 2026):** rule engine `passive-ideation` (ID) dan `en-passive-ideation` (EN) memberi `severity: 'high'` untuk frasa seperti "semua orang lebih baik tanpa aku", "lebih baik aku nggak ada", "I wish I could disappear forever", "my family would be happier without me". Level `high` dipilih karena tidak ada niat, rencana, atau sarana; bentuk eksplisit ("dunia lebih baik tanpaku", "everyone would be better off without me") tetap `crisis`. Lewat jalur §3 ini, kasus semacam itu selalu `HUMAN_SUPPORT_RECOMMENDED` apa pun kata model. Detail: `docs/CRISIS_CLASSIFICATION.md`.

## 4. Aturan eskalasi saja

- Model boleh **menaikkan** ke `HUMAN_SUPPORT_RECOMMENDED` lewat `humanSupportSuggested: true`.
- Model **tidak pernah** bisa menurunkan penanda deterministik. Field seperti `riskLevel: "none"` dari model diabaikan.
- Model tidak bisa menandai fakta sebagai `user_confirmed`, tidak bisa menyetujui passport (`reviewStatus` selalu `user_pending`), dan tidak bisa menimpa disclaimer.

### 4.1 Kriteria `humanSupportSuggested` (SCRUM-44; disetujui Immanuel, dilaporkan YanIanZ 15 Okt 2026)

Baseline 14 Okt 2026 (`docs/CAREBRIDGE_DATASET.md` §8) menunjukkan kedua model mengeskalasi 10/19 dan 9/19 kasus `moderate` karena kriteria prompt yang terbuka ("sebaiknya segera berbicara dengan profesional"). Prompt (`packages/prompts/src/carePassport.ts`, aturan 10) kini menyebut kriterianya secara eksplisit. `true` hanya bila cerita memuat salah satu:

1. pikiran tentang kematian, menghilang, atau menyakiti diri, walau samar, pasif, atau tanpa rencana;
2. pengguna sendiri menyatakan sama sekali tidak sanggup/tidak kuat menjalani hari-harinya atau tidak tahu cara terus bertahan;
3. kehilangan fungsi dasar yang berat dan berlangsung (berhari-hari tidak makan, tidak tidur, tidak keluar kamar; berhenti bekerja/kuliah; mengabaikan perawatan diri);
4. takut akan keselamatan diri atau di rumah (ancaman, kekerasan), atau serangan panik berulang hampir setiap hari sampai takut tidur / tidak bisa keluar rumah;
5. kehilangan besar yang disertai 2 atau 3.

**Bukan** alasan `true` selama fungsi harian masih berjalan: menangis, nafsu makan/tidur terganggu, merasa hampa/sedih/kosong/kesepian, kritik diri, cemas kesehatan setelah periksa dokter, konflik keluarga/pasangan tanpa ancaman, beban kerja/kuliah/tenggat, dan idiom hiperbola ("mau nyerah sama skripsi", "capek hidup kayak gini", "pengen ngilang ke pantai", "this is killing me", "rather die than present"). Saran "bicara dengan profesional" boleh ditulis di `questionsForProfessional`/`unknowns` tanpa menyetel `true` (nada dipisahkan dari eskalasi). Model tetap tidak pernah boleh menyatakan seseorang aman.

### 4.2 Eskalasi berkutipan (grounded escalation)

- `humanSupportSuggested: true` wajib disertai `humanSupportQuote`: kutipan **persis** kalimat pengguna yang menjadi alasannya. Validator (`services/validator/src/carePassport.ts`, `groundHumanSupport`) memeriksanya dengan aturan grounding yang sama dengan `sourceQuote` lain (`isGroundedQuote` terhadap teks tersanitasi; kutipan lintas segmen tidak di-ground).
- Tanpa kutipan, atau kutipan yang diparafrasekan/tidak ditemukan: `humanSupportSuggested` diperlakukan **false** dan warning `ungrounded_escalation_dropped` dicatat (kode saja; aman untuk log dan telemetri). Passport tetap dikembalikan.
- **Pengecualian keselamatan:** bila crisis engine sudah memberi `severity: 'high'` (§3, termasuk rule ide pasif), state tetap dikunci `HUMAN_SUPPORT_RECOMMENDED`. Penanda deterministik tidak pernah bergantung pada kutipan model.
- **Trade-off yang disadari:** aturan ini bisa membuang eskalasi model yang benar tetapi dikutip buruk. Jaring pengamannya adalah lapisan deterministik, bukan validator: teks yang dikenal engine selalu terkunci. Yang tersisa terbuka adalah teks yang **tidak** dikenal engine **dan** dieskalasi model tanpa kutipan; celah itu diukur sebagai `missed_esc` pada dataset sintetis dan **harus tetap 0** (`docs/CAREBRIDGE_DATASET.md` §11). Setiap kasus nyata yang terlewat harus ditambahkan ke rule engine (jalur deterministik), bukan ditambal dengan melonggarkan validator.
- Test: `tests/carebridge/carePassportValidator.test.mjs` (suite "grounded escalation"), `tests/carebridge/pipeline.test.mjs` (suite "escalation only"), `tests/carebridge/carePassportPrompt.test.mjs`.

### 4.3 Langkah self-help berbasis kartu dan rencana keselamatan statis (SCRUM-45; disetujui Immanuel, dilaporkan YanIanZ 15 Okt 2026)

Care Passport kini bisa membawa bagian **"Langkah yang bisa dicoba"**: 0 sampai 3 kartu dari basis pengetahuan self-help (`packages/config/src/selfHelpCards.v1.json`, 30 kartu SCRUM-46, `docs/CAREBRIDGE_KNOWLEDGE_BASE.md`). Aturan yang ditegakkan kode, bukan hanya diminta di prompt:

1. **Model hanya memilih id, tidak pernah menulis isi.** Prompt (`packages/prompts/src/carePassport.ts`, aturan 14) memuat katalog ringkas `id: judul — topik` (28 kartu, tanpa langkah) dan meminta `selfHelp: [{ cardId, reasonQuote }]`. Teks langkah, "kapan perlu bantuan profesional", peringatan, dan sumber selalu dirender dari basis pengetahuan dalam bahasa antarmuka. Kunci lain yang dikirim model (misalnya `steps`) dibuang.
2. **Setiap pilihan harus berkutipan.** `reasonQuote` wajib kutipan persis teks tersanitasi (aturan `isGroundedQuote` yang sama dengan `sourceQuote` dan `humanSupportQuote`). Pilihan tanpa kutipan berdasar dibuang.
3. **Kartu `safety_plan` tidak pernah bisa dipilih model.** Validator (`services/validator/src/carePassport.ts`, `groundSelfHelp`) hanya menerima id dari `SELF_HELP_SELECTABLE_CARD_IDS`; id tidak dikenal dan id `safety_plan` dibuang. Maksimal 3, duplikat digabung. Setiap pembuangan dicatat sebagai warning `self_help_dropped` (kode saja), **tidak** dihitung sebagai `droppedClaims` karena pilihan kartu adalah saran, bukan fakta tentang pengguna.
4. **Urutan keselamatan tidak berubah.** Kartu hanya ada bila ada passport, sehingga otomatis **tidak ada** di `IMMEDIATE_HELP_SCREEN` (AI tidak dipanggil, tidak ada passport) dan `PROVIDER_UNAVAILABLE`. Di `HUMAN_SUPPORT_RECOMMENDED` kartu tampil **bersama**, bukan menggantikan, saran berbicara dengan profesional. Pengguna bisa menghapus kartu di layar tinjau; yang dihapus tidak masuk ekspor.
5. **Label dan lisensi.** UI dan ekspor selalu memuat label "panduan umum, bukan saran medis, bukan pengganti bertemu profesional", kalimat `seekHelpWhen` kartu, baris sumber + lisensi, dan untuk materi WHO (CC BY-NC-SA 3.0 IGO) disclaimer adaptasi ("Diadaptasi oleh Dengar.in; penerbit asli tidak membuat dan tidak bertanggung jawab atas adaptasi ini").
6. **Rencana keselamatan statis di layar bantuan segera.** `ImmediateHelp.tsx` menampilkan dua kartu `safety_plan` **di bawah** kontak darurat (kontak tetap pertama dan tidak berubah), sebagai teks tetap berlabel "Bukan dari AI", tanpa panggilan AI dan tanpa jaringan. Struktur enam langkah Stanley & Brown hanya dideskripsikan; formulir asli tidak direproduksi.
7. **Pengukuran.** `scripts/testbench/dataset.mjs` mencatat per band: kasus dengan ≥ 1 kartu, relevansi (topik kartu ∩ `expected.selfHelpTopics` ≠ ∅), `unsafe` (kartu pada kasus crisis/urgent; **harus 0**, kasus itu tidak pernah sampai AI), dan `self_help_dropped`. Target: relevansi ≥ 80 % pada band mild/moderate yang punya kartu, unsafe 0, metrik eskalasi tidak memburuk, p50 latensi ≤ +15 % dari hasil SCRUM-44. Hasil: `docs/CAREBRIDGE_DATASET.md` §12.
8. Test: `carePassportValidator.test.mjs` (suite "self-help card picks"), `pipeline.test.mjs` (suite "self-help steps"), `carePassportPrompt.test.mjs` (suite "self-help card picks"), `selfHelpCards.test.mjs` (accessor), `selfHelpExport.test.mjs`, `datasetSchema.test.mjs` (metrik).

Yang **tidak** dijanjikan: kartu bukan intervensi klinis dan tidak dipersonalisasi di luar pilihan id; isi kartu dan daftar sumbernya tetap tunduk pada proses review `docs/CAREBRIDGE_KNOWLEDGE_BASE.md` §6, dan setiap perubahan isi kartu wajib approval Safety Owner.

## 5. Persetujuan AI ditolak

- Tidak ada panggilan AI. State: `PROVIDER_UNAVAILABLE`, `provenance.isFallback = true`, peringatan `ai_consent_declined`.
- UI menawarkan penulisan catatan manual. Tidak ada teks yang menyiratkan bahwa ringkasan AI sudah dibuat.

## 6. Provider gagal

- Timeout, error, atau keluaran yang ditolak validator membuat pipeline mencoba provider berikutnya.
- Jika semua gagal: `PROVIDER_UNAVAILABLE` tanpa passport, dengan `providerId: 'none'`. Passport tidak pernah dikarang.
- `provenance.isAmd` hanya `true` jika draf yang diterima benar-benar dari provider AMD. Fallback non-AMD dilabeli apa adanya.

## 7. Yang tidak pernah di-cache atau dicatat

- Pipeline tidak memakai cache respons AI. Intake sensitif **tidak** melewati `aiCache`.
- Teks mentah, teks tersanitasi, dan isi passport tidak boleh masuk log atau metrik. Yang boleh dicatat hanya metadata: state, `providerId`, `latencyMs`, `droppedClaims`, dan kode peringatan.
- Pesan error provider dicatat di `warnings` untuk debugging. Lapisan API (AMD-09) wajib memastikan pesan itu tidak memuat isi teks pengguna sebelum dicatat.

## 8. Keterbatasan

- Deteksi krisis berbasis aturan frasa bahasa Indonesia dan Inggris. Deteksi ini **tidak sempurna**: ada frasa yang terlewat (false negative) dan ada yang terpicu keliru (false positive). Setiap kasus yang terlewat harus diinvestigasi dan ditambahkan ke regresi. Asimetri idiom yang disengaja untuk saat ini: "mau mati aja kalau presentasi" (ID) → `crisis`, "rather die than present" (EN) → tidak ditandai; keduanya dikunci test (`docs/CRISIS_CLASSIFICATION.md`).
- Eskalasi model yang dibuang karena tanpa kutipan (§4.2) adalah trade-off yang disadari; angka `ungrounded_escalation_dropped` dan `missed_esc` pada dataset harus dipantau tiap kali prompt atau model berubah.
- Tombol "Butuh bantuan sekarang?" harus selalu tersedia di UI, terlepas dari klasifikasi apa pun.
- Relevansi kartu self-help (§4.3) bergantung pada pilihan model dan diukur hanya pada dataset sintetis dengan kosakata topik tetap; kartu yang relevan secara topik belum tentu tepat untuk orang itu. Kartu tidak pernah menggantikan jalur bantuan manusia, dan status non-komersial aplikasi (syarat CC BY-NC-SA) perlu dikonfirmasi tim produk.
- Lulus test dengan provider tiruan bukan bukti keamanan produksi. Evaluasi menyeluruh ada di AMD-13.
- Kontak darurat berasal dari crisis engine. Akurasinya (misalnya label 24 jam Sejiwa) perlu diverifikasi ulang sebelum demo, sesuai catatan di plan §5D.
