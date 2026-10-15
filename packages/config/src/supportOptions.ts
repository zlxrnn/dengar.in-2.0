/**
 * SUPPORT OPTIONS (AMD-12, /support-options)
 *
 * Informational directory only. Nothing here promises that a service will
 * answer, have capacity, or accept a referral. Every entry carries:
 *  - the source it was read from (official page, with its title),
 *  - the date it was last checked (YYYY-MM-DD),
 *  - the limits of what we know (hours, scope, queue, cost).
 *
 * Facts are copied from the verified notes above `EMERGENCY_CONTACTS` in
 * index.ts and from `helpDestinations.ts`. Anything those files mark
 * UNVERIFIED (KPAI WhatsApp, TePSA 24-hour claim, Healing119 WhatsApp number,
 * BPJS referral validity period) is deliberately left out or stated as unknown.
 * Re-check every source before a demo or release.
 */

export type SupportOptionCategory = 'mental_health_line' | 'counselling' | 'health_facility' | 'child_protection' | 'financial';

export interface LocalizedText {
  id: string;
  en: string;
}

export interface SupportOption {
  id: string;
  category: SupportOptionCategory;
  name: LocalizedText;
  summary: LocalizedText;
  phone?: string;
  whatsapp?: string;
  website?: string;
  /** Hours exactly as the source states them; never rounded up to "24 jam". */
  hours: LocalizedText;
  cost: LocalizedText;
  /** What we do NOT know or what this service does NOT do. Never empty. */
  limits: { id: string[]; en: string[] };
  source: { title: string; url: string; publisher: string };
  /** YYYY-MM-DD the source was last read. */
  lastVerified: string;
}

export const SUPPORT_OPTIONS_NOTICE: { id: string; en: string } = {
  id: 'Daftar ini hanya informasi. Kami tidak menjamin layanan mana pun akan menjawab, punya kuota, atau menerima rujukan. Cek langsung ke layanannya. Dalam keadaan darurat, hubungi layanan darurat setempat.',
  en: 'This list is information only. We cannot guarantee that any service will answer, have capacity, or accept a referral. Check with the service directly. In an emergency, contact local emergency services.',
};

export const SUPPORT_OPTIONS: readonly SupportOption[] = [
  {
    id: 'healing119-kemenkes',
    category: 'mental_health_line',
    name: { id: 'Healing119 (Kemenkes)', en: 'Healing119 (Ministry of Health)' },
    summary: {
      id: 'Dukungan psikologis awal dari Kementerian Kesehatan lewat telepon atau chat.',
      en: 'First-line psychological support from the Ministry of Health by phone or chat.',
    },
    phone: '119 ext 8',
    website: 'https://www.healing119.id/',
    hours: { id: 'Pagi hingga malam (bukan 24 jam)', en: 'Morning to night (not 24 hours)' },
    cost: { id: 'Gratis menurut Kemenkes', en: 'Free, per the Ministry of Health' },
    limits: {
      id: [
        'Jam tepatnya tidak tercantum di sumber resmi; tidak ada klaim 24 jam. Cek situsnya.',
        'Dukungan psikologis awal, bukan terapi. Konselor dapat membantu merujuk.',
        'Nomor WhatsApp tidak kami tulis karena belum ada di halaman resmi. Ambil dari healing119.id.',
        'Antrean telepon bisa panjang; kami tidak bisa memastikan waktu tunggu.',
      ],
      en: [
        'Exact hours are not given by the official source; no 24-hour claim. Check the website.',
        'First-line psychological support, not therapy. Counsellors can help with referral.',
        'We do not list a WhatsApp number because it is not on an official page. Get it from healing119.id.',
        'Phone queues can be long; we cannot confirm waiting times.',
      ],
    },
    source: {
      title: 'Cegah bunuh diri, dukung kesehatan jiwa: kenali layanan Healing119.id (7 Agu 2025)',
      url: 'https://kesprimkom.kemkes.go.id/konten/127/151/0/cegah-bunuh-diri-dukung-kesehatan-jiwa-kenali-layanan-healing119-id',
      publisher: 'Kemenkes, Ditjen Kesmas',
    },
    lastVerified: '2026-10-14',
  },
  {
    id: 'lisa-helpline',
    category: 'mental_health_line',
    name: { id: 'LISA Helpline (Bali Bersama Bisa)', en: 'LISA Helpline (Bali Bersama Bisa)' },
    summary: {
      id: 'Dukungan emosional lewat WhatsApp oleh pendengar terlatih, bahasa Indonesia atau Inggris.',
      en: 'Emotional support over WhatsApp by trained listeners, in Indonesian or English.',
    },
    whatsapp: '0811-3855-472',
    website: 'https://bisahelpline.org',
    hours: { id: 'Sesi online terjadwal, bisa masuk daftar tunggu', en: 'Scheduled online sessions, may be waitlisted' },
    cost: { id: 'Gratis menurut situs resmi', en: 'Free, per the official website' },
    limits: {
      id: [
        'Sesi dijadwalkan dan bisa masuk daftar tunggu; tidak ada jaminan dibalas segera.',
        'Lewat pesan WhatsApp saja. Situs resminya tidak mencantumkan nomor telepon.',
        'Bukan layanan gawat darurat medis.',
      ],
      en: [
        'Sessions are scheduled and may be waitlisted; no guarantee of an immediate reply.',
        'WhatsApp messages only. The official site lists no phone number.',
        'Not a medical emergency service.',
      ],
    },
    source: {
      title: 'bisahelpline.org (operator LISA), halaman Contact dan About us',
      url: 'https://bisahelpline.org',
      publisher: 'Bali Bersama Bisa Foundation',
    },
    lastVerified: '2026-10-14',
  },
  {
    id: 'yayasan-pulih',
    category: 'counselling',
    name: { id: 'Yayasan Pulih', en: 'Yayasan Pulih' },
    summary: {
      id: 'Konseling trauma dan pemulihan psikologis.',
      en: 'Trauma counselling and psychological recovery.',
    },
    phone: '021-7884-2580',
    whatsapp: '0811-843-6633',
    website: 'https://yayasanpulih.or.id/',
    hours: {
      id: 'Kantor Senin-Jumat 9.00-17.00; Layanan Psikologi Selasa-Sabtu 9.00-16.00',
      en: 'Office Mon-Fri 9:00-17:00; Psychology service Tue-Sat 9:00-16:00',
    },
    cost: { id: 'Berbayar (tarif standar); besarnya tidak kami ketahui', en: 'Paid (standard rates); amount unknown to us' },
    limits: {
      id: [
        'Hanya jam kantor; bukan layanan 24 jam dan bukan untuk keadaan darurat.',
        'Biaya tidak kami tulis karena tidak kami pastikan. Tanyakan langsung.',
        'Kami tidak tahu apakah ada slot kosong atau daftar tunggu.',
      ],
      en: [
        'Office hours only; not a 24-hour or emergency service.',
        'We do not list prices because we cannot confirm them. Ask directly.',
        'We do not know whether slots are open or there is a waiting list.',
      ],
    },
    source: {
      title: 'yayasanpulih.or.id, halaman layanan',
      url: 'https://yayasanpulih.or.id/',
      publisher: 'Yayasan Pulih',
    },
    lastVerified: '2026-10-15',
  },
  {
    id: 'fktp-puskesmas',
    category: 'health_facility',
    name: { id: 'Puskesmas / dokter FKTP', en: 'Community health centre / FKTP doctor' },
    summary: {
      id: 'Pintu pertama untuk meminta rujukan ke psikolog atau poli jiwa lewat BPJS.',
      en: 'First step to ask for a referral to a psychologist or psychiatric clinic through BPJS.',
    },
    hours: { id: 'Berbeda tiap fasilitas; tanyakan langsung', en: 'Varies by facility; ask directly' },
    cost: { id: 'Tergantung kepesertaan BPJS; tanyakan langsung', en: 'Depends on BPJS membership; ask directly' },
    limits: {
      id: [
        'Tidak semua puskesmas punya layanan jiwa atau psikolog.',
        'Aturan rujukan bisa berbeda per daerah dan bisa berubah. Masa berlaku rujukan tidak kami tulis.',
        'Syarat kepesertaan BPJS bersumber dari media, bukan dokumen BPJS.',
      ],
      en: [
        'Not every health centre has mental health services or a psychologist.',
        'Referral rules differ by region and can change. We do not state a referral validity period.',
        'BPJS membership requirements come from media reporting, not a BPJS document.',
      ],
    },
    source: {
      title: 'Kemenkes kembangkan jejaring pelayanan kesehatan jiwa di seluruh fasyankes (10 Okt 2022)',
      url: 'https://www.kemkes.go.id/id/kemenkes-kembangkan-jejaring-pelayanan-kesehatan-jiwa-di-seluruh-fasyankes',
      publisher: 'Kemenkes',
    },
    lastVerified: '2026-10-13',
  },
  {
    id: 'tepsa-kemensos',
    category: 'child_protection',
    name: { id: 'TePSA Kemensos (anak di bawah 18 tahun)', en: 'TePSA Ministry of Social Affairs (under 18)' },
    summary: {
      id: 'Telepon layanan sosial anak dari Kementerian Sosial: telekonseling, tanggap darurat, dan rujukan.',
      en: 'Child social service line from the Ministry of Social Affairs: tele-counselling, emergency response and referral.',
    },
    phone: '1500-771',
    website: 'https://kemensos.go.id',
    hours: { id: 'Tanyakan saat menelepon', en: 'Ask when you call' },
    cost: { id: 'Gratis (belum terverifikasi dari sumber resmi)', en: 'Free (not verified from the official source)' },
    limits: {
      id: [
        'Untuk anak di bawah 18 tahun. Pengguna CareBridge adalah dewasa 18+; ini hanya informasi.',
        'Jam layanan dan klaim 24 jam belum terverifikasi, jadi tidak kami nyatakan.',
        'Sumber resmi bertanggal 9 April 2020; kami belum memastikan apakah masih sama.',
      ],
      en: [
        'For children under 18. CareBridge users are adults 18+; this is information only.',
        'Hours and any 24-hour claim are unverified, so we do not state them.',
        'The official source is dated 9 April 2020; we have not confirmed it is still current.',
      ],
    },
    source: {
      title: "Children's Social Service Telephone (TePSA) ready to receive online services (9 Apr 2020)",
      url: 'https://kemensos.go.id/en/childrens-social-service-telephone-tepsa-ready-to-receive-online-services',
      publisher: 'Kementerian Sosial RI',
    },
    lastVerified: '2026-10-14',
  },
  {
    id: 'ojk-157',
    category: 'financial',
    name: { id: 'Kontak OJK 157', en: 'OJK Contact 157' },
    summary: {
      id: 'Pengaduan teror penagihan, pinjaman online ilegal, dan penipuan keuangan.',
      en: 'Complaints about harassment by debt collectors, illegal online loans and financial fraud.',
    },
    phone: '157',
    whatsapp: '081-157-157-157',
    website: 'https://kontak157.ojk.go.id',
    hours: {
      id: 'Telepon setiap hari 24 jam (sejak 10 Okt 2025); WhatsApp 07.45-16.50 WIB',
      en: 'Phone daily, 24 hours (since 10 Oct 2025); WhatsApp 07:45-16:50 WIB',
    },
    cost: { id: 'Gratis (belum terverifikasi dari sumber resmi)', en: 'Free (not verified from the official source)' },
    limits: {
      id: [
        'Hanya untuk masalah keuangan konsumen. Bukan layanan kesehatan mental atau konseling.',
        'Jam 24 jam berlaku untuk telepon saja, bukan WhatsApp.',
        'Jadwal bersumber dari pengumuman OJK 22 Jul 2025; jadwal bisa berubah.',
      ],
      en: [
        'For consumer financial problems only. Not a mental health or counselling service.',
        'The 24-hour schedule applies to the phone line only, not WhatsApp.',
        'Schedule comes from an OJK announcement dated 22 Jul 2025 and may change.',
      ],
    },
    source: {
      title: 'Jadwal Operasional Kontak 157 (22 Jul 2025)',
      url: 'https://ojk.go.id/id/berita-dan-kegiatan/publikasi/Pages/Jadwal-Operasional-Kontak-157.aspx',
      publisher: 'Otoritas Jasa Keuangan',
    },
    lastVerified: '2026-10-14',
  },
];

const OPTION_IDS: ReadonlySet<string> = new Set(SUPPORT_OPTIONS.map((o) => o.id));

export function isSupportOptionId(value: unknown): boolean {
  return typeof value === 'string' && OPTION_IDS.has(value);
}

