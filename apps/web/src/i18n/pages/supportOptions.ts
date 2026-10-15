import type { TextBundle } from '../language';

const id = {
  back: 'Kembali ke beranda',
  badge: 'Terverifikasi, bukan jaminan layanan',
  title: 'Pilihan bantuan terverifikasi',
  intro:
    'Setiap pilihan di bawah mencantumkan sumbernya, tanggal terakhir dicek, dan batas informasi yang kami punya. Kami tidak menjanjikan ketersediaan layanan mana pun.',
  urgent: 'Butuh bantuan sekarang? Buka halaman bantuan darurat',
  listAria: 'Daftar pilihan bantuan',
  filterLabel: 'Saring menurut jenis',
  filterAria: 'Filter jenis bantuan',
  categories: {
    all: 'Semua',
    mental_health_line: 'Saluran kesehatan jiwa',
    counselling: 'Konseling',
    health_facility: 'Fasilitas kesehatan',
    child_protection: 'Perlindungan anak',
    financial: 'Masalah keuangan',
  },
  hours: 'Jam layanan',
  cost: 'Biaya',
  limits: 'Batas informasi',
  source: 'Sumber',
  verified: 'Terakhir dicek',
  openSource: (publisher: string) => `Buka sumber dari ${publisher} (tab baru)`,
  callAria: (name: string, phone: string) => `Telepon ${name}: ${phone}`,
  whatsappAria: (name: string, number: string) => `WhatsApp ${name}: ${number}`,
  websiteAria: (name: string) => `Buka situs ${name} (tab baru)`,
  call: 'Telepon',
  website: 'Situs',
  generalDirectory: 'Lihat juga daftar kontak lengkap',
};

const en: typeof id = {
  back: 'Back to home',
  badge: 'Verified, not a service guarantee',
  title: 'Verified support options',
  intro:
    'Each option below shows its source, the date it was last checked, and the limits of what we know. We do not promise that any service is available.',
  urgent: 'Need help right now? Open the urgent help page',
  listAria: 'List of support options',
  filterLabel: 'Filter by type',
  filterAria: 'Support type filter',
  categories: {
    all: 'All',
    mental_health_line: 'Mental health lines',
    counselling: 'Counselling',
    health_facility: 'Health facilities',
    child_protection: 'Child protection',
    financial: 'Money problems',
  },
  hours: 'Hours',
  cost: 'Cost',
  limits: 'Limits of this information',
  source: 'Source',
  verified: 'Last checked',
  openSource: (publisher: string) => `Open source from ${publisher} (new tab)`,
  callAria: (name: string, phone: string) => `Call ${name}: ${phone}`,
  whatsappAria: (name: string, number: string) => `WhatsApp ${name}: ${number}`,
  websiteAria: (name: string) => `Open the ${name} website (new tab)`,
  call: 'Call',
  website: 'Website',
  generalDirectory: 'See also the full contact directory',
};

export const supportOptionsText: TextBundle<typeof id> = { id, en };

