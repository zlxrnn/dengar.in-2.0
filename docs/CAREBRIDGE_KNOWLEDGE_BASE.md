# Basis Pengetahuan Self-Help CareBridge (SCRUM-46, dipakai runtime sejak SCRUM-45)

**Status:** **dipakai di runtime** sejak SCRUM-45 (disetujui Justin, dilaporkan YanIanZ 15 Okt 2026): kartu dipilih model lewat id dan ditampilkan di Care Passport serta layar bantuan segera (`docs/CAREBRIDGE_SAFETY_POLICY.md` §4.3). Isi kartu dan tabel sumber §3 tetap tunduk pada review Safety Owner (Justin) sesuai §6.
**Data:** `packages/config/src/selfHelpCards.v1.json` (30 kartu, 16 topik; dipindah dari `tests/carebridge/dataset/` agar bisa di-import aplikasi dan services). **Accessor bertipe:** `packages/config/src/selfHelpCards.ts` (`SELF_HELP_CARDS`, `SELF_HELP_CARD_IDS`, `SELF_HELP_SELECTABLE_CARD_IDS`, `SAFETY_PLAN_CARD_IDS`, `getSelfHelpCard(id)`, `isSelectableSelfHelpCardId(id)`, `selfHelpCatalogForPrompt(lang)`, `selfHelpAttribution(card)`, `selfHelpLicenseLabel(card, lang)`). **Artefak:** `tests/carebridge/dataset/self_help_cards.v1.pb.zst` + `manifest.json` (`npm run dataset:build`). **Test:** `tests/carebridge/selfHelpCards.test.mjs`.
**Tanggal riset sumber:** 15 Oktober 2026.

## 1. Tujuan

Kumpulan "kartu strategi" self-help berbasis bukti untuk orang dewasa (18+) yang sedang menyiapkan diri sebelum konsultasi
(Care Passport) atau sekadar butuh langkah kecil yang aman. Setiap kartu berisi: judul, ringkasan satu kalimat, 2–5 langkah
singkat, alasan ("why") dalam bahasa sederhana tanpa klaim berlebihan, kapan harus bicara dengan profesional/darurat,
peringatan (opsional), sumber dengan lisensi, dan catatan jenis bukti. Semua teks tersedia dalam bahasa Indonesia (register
hangat, "kamu") dan Inggris.

Prinsip isi, selaras dengan `docs/CAREBRIDGE_SAFETY_POLICY.md` dan `docs/AI_POLICY.md` §3:

- tidak ada label diagnosis sebagai kesimpulan, tidak ada nama atau dosis obat/suplemen, tidak ada klaim "ini terapi" atau janji hasil;
- tidak ada langkah napas atau grounding yang berisiko (tanpa menahan napas, selalu ada instruksi berhenti kalau pusing);
- tidak ada saran pinjaman, investasi, atau jasa keuangan tertentu (kartu `money`);
- bahasa netral dan tidak menghakimi; setiap kartu selalu memuat jalur bantuan (profesional, Puskesmas, IGD, 119 ext 8);
- semua isi adalah **parafrase** dari panduan publik berlisensi terbuka atau panduan sektor publik; **tidak ada** kutipan panjang,
  dan **tidak ada** cerita personal yang di-scrape.

## 2. Cara kartu dipakai

- **Prompt** (`packages/prompts/src/carePassport.ts`, aturan 14): system prompt memuat katalog ringkas dari `selfHelpCatalogForPrompt('id')`,
  satu baris per kartu yang boleh dipilih (`id: judul — topik`; 28 baris, ~2,5 ribu karakter, tanpa langkah). Model mengembalikan
  `selfHelp: [{ cardId, reasonQuote }]`, 0–3 butir, hanya untuk hal yang benar-benar disebut pengguna, dengan kutipan persis.
- **Validator** (`services/validator/src/carePassport.ts`, `groundSelfHelp`): hanya id dari `SELF_HELP_SELECTABLE_CARD_IDS`
  (kartu `safety_plan` ditolak), `reasonQuote` harus berdasar seperti `sourceQuote`, maks. 3, duplikat digabung, kunci lain
  (misalnya `steps` buatan model) dibuang; pembuangan dicatat sebagai warning `self_help_dropped`, bukan `droppedClaims`.
- **UI** (`apps/web/src/components/carePassport/SelfHelpSteps.tsx` di `PassportReview`): judul, 2–5 langkah, "Kenapa ini: '<kutipan>'",
  "Kapan perlu bantuan profesional" (`seekHelpWhen`), peringatan, baris sumber + lisensi, dan disclaimer adaptasi untuk kartu WHO;
  label "Panduan umum", bukan saran medis. Tampil di `READY_FOR_USER_REVIEW` dan `HUMAN_SUPPORT_RECOMMENDED` (bersama saran profesional),
  tidak pernah di `IMMEDIATE_HELP_SCREEN` atau `PROVIDER_UNAVAILABLE`. Pengguna bisa menghapus kartu; yang dihapus tidak diekspor.
- **Ekspor** (`apps/web/src/lib/carePassportExport.ts`): bagian "Langkah yang bisa dicoba" dengan teks kartu dari basis pengetahuan,
  kutipan alasan, baris sumber/lisensi/URL, dan disclaimer adaptasi; tetap hanya setelah `user_approved` dan atas tindakan pengguna.
- **Kartu `safety_plan`** (2) hanya dirender statis di layar bantuan segera (`ImmediateHelp.tsx`, komponen `SafetyPlanCards`) **di bawah**
  kontak darurat, berlabel "Bukan dari AI", tanpa panggilan AI dan tanpa jaringan. Tidak pernah bisa dipilih model.
- **Evaluasi:** `scripts/testbench/dataset.mjs` mengukur kasus dengan ≥ 1 kartu, relevansi terhadap `expected.selfHelpTopics`, `unsafe`
  (harus 0), dan `self_help_dropped` per band (`docs/CAREBRIDGE_DATASET.md` §7 dan §12).
- Kosakata topik tetap (jangan diubah tanpa menyinkronkan dengan dataset evaluasi): `stress, sleep, worry, low_mood,
  overload_study, overload_work, money, loneliness, grief, relationship_conflict, family_conflict, grounding, health_worry,
  self_criticism, burnout, safety_plan`.

## 3. Tabel sumber, lisensi, dan keputusan

Semua URL dan lisensi diverifikasi 15 Okt 2026. Untuk publikasi WHO, halaman hak cipta di PDF (via IRIS) dibaca langsung.

| Sumber | Penerbit / tahun | Lisensi (terverifikasi) | Keputusan | Alasan |
|---|---|---|---|---|
| [Doing What Matters in Times of Stress](https://www.who.int/publications/i/item/9789240003927) | WHO, 2020 | CC BY-NC-SA 3.0 IGO (halaman hak cipta PDF) | **Dipakai** (10 kartu) | Panduan self-help; lima alat: grounding, unhooking, nilai, berbaik hati, memberi ruang |
| [Self-Help Plus (SH+)](https://www.who.int/publications/i/item/9789240035119) | WHO, 2021 | CC BY-NC-SA 3.0 IGO | **Latar/pendukung** | Program berbasis materi di atas, diuji RCT; dirujuk di `evidenceNote`, bukan sumber utama kartu |
| [Problem Management Plus (PM+), generic field-trial v1.1](https://iris.who.int/handle/10665/375604) | WHO, 2018 (WHO/MSD/MER/18.5) | CC BY-NC-SA 3.0 IGO (halaman hak cipta PDF + metadata IRIS) | **Dipakai** (8 kartu) | Napas lambat, pemecahan masalah 6 langkah, aktivasi ("Get Going, Keep Doing"), dukungan sosial. **Catatan:** PM+ v1.0 (2016) berstatus "All rights reserved" dan tidak dipakai |
| [WHO guidelines on mental health at work](https://www.who.int/publications/i/item/9789240053052) | WHO, 2022 | CC BY-NC-SA 3.0 IGO | **Dipakai** (3 kartu) | Risiko psikososial kerja, intervensi individu (manajemen stres, aktivitas fisik) |
| [From loneliness to social connection (Komisi WHO)](https://www.who.int/publications/i/item/978240112360) | WHO, 2025 | CC BY-NC-SA 3.0 IGO | **Dipakai** (1 kartu) | Data prevalensi dan dampak kesepian; langkah individu bersifat editorial dan ditandai di `evidenceNote` |
| [mhGAP Intervention Guide v2.0](https://www.who.int/publications/i/item/9789241549790) | WHO, 2016 | **© WHO 2016, All rights reserved** (halaman hak cipta PDF) | **Latar saja** | Bukan CC; dipakai hanya untuk memastikan arah isi (psikoedukasi, "kapan rujuk"), tidak diparafrasekan langsung |
| [Psychological first aid: Guide for field workers](https://www.who.int/publications/i/item/9789241548205) | WHO / War Trauma Foundation / World Vision, 2011 | **© WHO 2011, All rights reserved** | **Latar saja** | Bukan CC; prinsip Look–Listen–Link hanya menjadi acuan nada "dengarkan tanpa memaksa" |
| Stanley & Brown (2012), *Safety Planning Intervention*, Cogn Behav Pract 19(2):256–264, [doi:10.1016/j.cbpra.2011.01.001](https://doi.org/10.1016/j.cbpra.2011.01.001) | Elsevier | **Berbayar**; formulir © Stanley & Brown 2008/2021 (izin tertulis untuk perubahan/EMR) | **Dipakai terbatas: struktur saja** (2 kartu) | Hanya enam langkah (fakta/metode) yang dideskripsikan dengan kata sendiri; tidak ada teks atau formulir yang direproduksi. Prinsip penggunaan dicek lewat panduan singkat klinisi SPRC (©2008 Stanley & Brown, dicetak ulang dengan izin) |
| [suicidesafetyplan.com](https://suicidesafetyplan.com/) | pihak ketiga ("All rights reserved") | tidak terbuka | **Dikecualikan** | Footer "All Rights Reserved" dari pihak ketiga; tidak diperlukan |
| [CDC – About Sleep](https://www.cdc.gov/sleep/about/index.html) | CDC (AS), 15 Mei 2024 | Domain publik (karya pemerintah federal AS; atribusi, tanpa klaim dukungan) | **Dipakai** (2 kartu) | Kebiasaan tidur dasar. URL `…/sleep/about/sleep-hygiene.html` di brief **404**, diganti halaman ini |
| [Kemenkes Ayo Sehat – Apa Itu Stres](https://ayosehat.kemkes.go.id/apa-itu-stres) | Kemenkes RI, 4 Jul 2024 | Tidak ada pernyataan lisensi; karya pemerintah (UU 28/2014 Pasal 43 huruf b) | **Dipakai, parafrase saja** (1 kartu) | Panduan publik berbahasa Indonesia; tidak ada teks yang disalin |
| [Kemenkes Ayo Sehat – 10 Cara Menjaga Kesehatan Mental](https://ayosehat.kemkes.go.id/cara-menjaga-kesehatan-mental) | Kemenkes RI, 13 Jan 2025 | sama seperti di atas | **Dipakai, parafrase saja** (2 kartu) | Istirahat, batas kerja–pribadi, menerima diri, bersyukur |
| [Kemenkes Ditjen Keslan – Penting Tidur Berkualitas](https://keslan.kemkes.go.id/read/2539/penting-tidur-berkualitas-jaga-kesehatan-fisik-dan-mental) | Kemenkes RI, 18 Mar 2025 | sama seperti di atas | **Dipakai, parafrase saja** (1 kartu) | 7–9 jam untuk dewasa, rutinitas, tanda masalah tidur |
| [Kemenkes Ditjen Keslan – Stress Management](https://keslan.kemkes.go.id/view_artikel/2917/stress-management-kelola-kesulitan-menjadi-kemudahan) | Kemenkes RI, 6 Nov 2023 | sama seperti di atas | **Latar saja** | Isinya tumpang tindih dengan dua halaman Ayo Sehat; gambar sampul dari Freepik (lisensi pihak ketiga) |
| p2ptm.kemkes.go.id (infografik stres) | Kemenkes RI | — | **Dikecualikan** | Halaman **404** saat diakses |
| [NHS Every Mind Matters](https://www.nhs.uk/every-mind-matters/) | NHS (Inggris) | OGL v3.0 **dengan syarat tambahan NHS**: penyegaran konten ≤ 7 hari, terjemahan/adaptasi membatalkan persetujuan klinis | **Latar saja** | Syarat penyegaran tidak realistis untuk dataset statis dan adaptasi ke bahasa Indonesia menanggung risiko klinis; hanya dirujuk di satu `evidenceNote` (health_worry) sebagai prinsip umum |
| Mirror pihak ketiga PDF WHO (medbox, mhpsshub, dsb.) | — | — | **Dikecualikan** | Dipakai hanya PDF resmi dari IRIS WHO |

Catatan lisensi CC BY-NC-SA 3.0 IGO: parafrase/adaptasi diperbolehkan untuk tujuan non-komersial dengan atribusi dan lisensi
turunan yang setara; adaptasi harus memuat disclaimer bahwa WHO tidak membuat dan tidak bertanggung jawab atas adaptasi tersebut.
Sejak SCRUM-45 kartu ditampilkan ke pengguna: **disclaimer adaptasi WHO dan atribusi CDC/Kemenkes muncul** di setiap kartu (UI dan
ekspor) lewat `selfHelpAttribution` (`adapted: true` untuk CC BY-NC-SA) dan `selfHelpLicenseLabel`. Status non-komersial aplikasi tetap
perlu dikonfirmasi tim produk.

## 4. Jumlah kartu per topik

stress 6 · sleep 3 · worry 4 · low_mood 4 · overload_study 3 · overload_work 3 · money 2 · loneliness 3 · grief 3 ·
relationship_conflict 2 · family_conflict 2 · grounding 2 · health_worry 1 · self_criticism 3 · burnout 4 · safety_plan 2.
(Satu kartu bisa punya beberapa topik; total 30 kartu.)

## 5. Yang perlu perhatian Safety/QA

1. Kartu `safety_plan` (2): memastikan konteks tampil hanya di layar bantuan segera / didampingi; cek nomor kontak (119 ext 8) tetap
   konsisten dengan crisis engine.
2. Kartu `health_worry`: memastikan kalimat "kartu ini tidak menilai penyebab gejala" cukup kuat agar tidak menunda pemeriksaan medis.
3. Kartu `napas-lambat-tiga-hitungan`: tinjau peringatan (tanpa menahan napas, berhenti kalau pusing) dan kalimat gawat darurat.
4. Kartu `money`: pastikan tidak ada yang bisa dibaca sebagai saran keuangan.
5. Terjemahan Inggris adalah terjemahan tim, bukan terjemahan resmi WHO/Kemenkes.
6. Lisensi Kemenkes: tidak ada pernyataan eksplisit; dasar pemakaian adalah UU Hak Cipta 28/2014 Pasal 43 huruf b dan parafrase.
   Perlu konfirmasi legal sebelum rilis publik.

## 6. Proses pembaruan

1. Tambah/ubah kartu hanya lewat PR dengan key Jira. File kini berada di `packages/config/` (file bersama, `COLLABORATION_RULES.md` §3:
   approval Release Owner + pemilik fitur CareBridge, YanIanZ), dan setiap perubahan isi kartu wajib approval Safety Owner
   (aturan `COLLABORATION_RULES.md` §1.10 untuk konten yang menyentuh jalur krisis). Setelah mengubah JSON, jalankan `npm run dataset:build`.
2. Setiap kartu baru wajib: sumber dengan URL + lisensi yang diverifikasi + tanggal akses; parafrase (tanpa kutipan > 15 kata);
   lolos `selfHelpCards.test.mjs` (skema, topik, bilingual, istilah terlarang, jalur bantuan).
3. Sumber baru ditambahkan ke tabel §3 dengan keputusan (dipakai / latar / dikecualikan) dan alasannya; host baru harus ditambahkan
   ke daftar `approvedHosts` di test.
4. Versi dataset dinaikkan (`self_help_cards.v2.json`) bila skema berubah; perubahan isi saja cukup di file v1 dengan catatan di PR.
5. Tinjau ulang tautan dan lisensi minimal setiap 6 bulan atau saat sumber menerbitkan edisi baru.
