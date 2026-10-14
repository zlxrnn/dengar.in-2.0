# Basis Pengetahuan Self-Help CareBridge (SCRUM-46)

**Status:** draf, **menunggu review Safety/QA** (Safety Owner: Immanuel). Belum dipakai oleh pipeline mana pun.
**Data:** `tests/carebridge/dataset/self_help_cards.v1.json` (30 kartu, 16 topik). **Test:** `tests/carebridge/selfHelpCards.test.mjs`.
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

- **Sekarang:** hanya sebagai dataset yang divalidasi test (`npm run test:carebridge` ikut menjalankan `selfHelpCards.test.mjs`).
  Agen/tim lain membangun dataset evaluasi terhadap kosakata topik yang sama.
- **Rencana (SCRUM-45, belum dibuat):** kartu dipilih secara **deterministik** berdasarkan topik yang sudah tervalidasi dari
  Care Passport, lalu ditampilkan sebagai saran "langkah kecil" di layar hasil, **setelah** gerbang krisis. Model AI tidak
  menulis ulang isi kartu; model paling banyak memilih id kartu dari daftar tetap, dan pilihannya tetap divalidasi.
- Kartu `safety_plan` hanya untuk layar bantuan segera / konteks yang sudah didampingi profesional; bukan latihan mandiri biasa.
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
Kalau Dengar.in menampilkan kartu ini ke pengguna (SCRUM-45), **disclaimer adaptasi WHO dan atribusi CDC/Kemenkes wajib muncul**
di UI atau halaman sumber. Status non-komersial aplikasi perlu dikonfirmasi tim produk.

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

1. Tambah/ubah kartu hanya lewat PR dengan key Jira; pemilik wilayah `tests/carebridge/` adalah pemilik fitur CareBridge (YanIanZ),
   dan setiap perubahan isi kartu wajib approval Safety Owner (aturan `COLLABORATION_RULES.md` §1.10 untuk konten yang menyentuh jalur krisis).
2. Setiap kartu baru wajib: sumber dengan URL + lisensi yang diverifikasi + tanggal akses; parafrase (tanpa kutipan > 15 kata);
   lolos `selfHelpCards.test.mjs` (skema, topik, bilingual, istilah terlarang, jalur bantuan).
3. Sumber baru ditambahkan ke tabel §3 dengan keputusan (dipakai / latar / dikecualikan) dan alasannya; host baru harus ditambahkan
   ke daftar `approvedHosts` di test.
4. Versi dataset dinaikkan (`self_help_cards.v2.json`) bila skema berubah; perubahan isi saja cukup di file v1 dengan catatan di PR.
5. Tinjau ulang tautan dan lisensi minimal setiap 6 bulan atau saat sumber menerbitkan edisi baru.
