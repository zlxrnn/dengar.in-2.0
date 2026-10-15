import type { TextBundle } from '../language';

const id = {
  back: 'Kembali ke beranda',
  badge: 'Sintetis, khusus reviewer',
  title: 'Demo reviewer (data sintetis)',
  intro: 'Ilustrasi untuk juri dan reviewer tentang bagaimana CareBridge menampilkan sumber, hal yang belum diketahui, dan jalur keselamatan.',
  urgent: 'Butuh bantuan sekarang? Buka halaman bantuan darurat',
  casesLabel: 'Pilih kasus sintetis',
  casesAria: 'Kasus sintetis',
  caseWord: 'Kasus',
  inputHeading: 'Cerita sintetis',
  inputHidden: 'Disembunyikan dengan sengaja (input berisiko tinggi dari fixture terkontrol).',
  redactedHeading: 'Setelah redaksi',
  stateHeading: 'Status hasil',
  fieldsHeading: 'Fakta dengan kutipan sumber',
  quote: 'Kutipan',
  noFields: 'Tidak ada fakta yang ditampilkan untuk kasus ini.',
  unknownsHeading: 'Belum diketahui',
  clarificationHeading: 'Satu pertanyaan klarifikasi',
  noticeHeading: 'Yang perlu diperhatikan reviewer',
  checklistHeading: 'Daftar periksa reviewer (simulasi)',
  checklistNote: 'Centang ini hanya ada di layar ini. Tidak dikirim dan tidak disimpan.',
  checkedAll: 'Semua poin sudah ditandai di layar ini (simulasi lokal).',
  states: {
    READY_FOR_USER_REVIEW: 'Siap ditinjau pengguna',
    NEEDS_CLARIFICATION: 'Perlu klarifikasi',
    IMMEDIATE_HELP_SCREEN: 'Layar bantuan segera',
    PROVIDER_UNAVAILABLE: 'AI tidak tersedia',
  },
};

const en: typeof id = {
  back: 'Back to home',
  badge: 'Synthetic, reviewers only',
  title: 'Reviewer demo (synthetic data)',
  intro: 'An illustration for judges and reviewers of how CareBridge shows sources, unknowns and the safety path.',
  urgent: 'Need help right now? Open the urgent help page',
  casesLabel: 'Choose a synthetic case',
  casesAria: 'Synthetic cases',
  caseWord: 'Case',
  inputHeading: 'Synthetic story',
  inputHidden: 'Deliberately hidden (high-risk input from a controlled fixture).',
  redactedHeading: 'After redaction',
  stateHeading: 'Result state',
  fieldsHeading: 'Facts with source quotes',
  quote: 'Quote',
  noFields: 'No facts are shown for this case.',
  unknownsHeading: 'Not yet known',
  clarificationHeading: 'One clarification question',
  noticeHeading: 'What the reviewer should notice',
  checklistHeading: 'Reviewer checklist (simulated)',
  checklistNote: 'These ticks exist only on this screen. Nothing is sent or stored.',
  checkedAll: 'All points ticked on this screen (local simulation).',
  states: {
    READY_FOR_USER_REVIEW: 'Ready for user review',
    NEEDS_CLARIFICATION: 'Needs clarification',
    IMMEDIATE_HELP_SCREEN: 'Immediate help screen',
    PROVIDER_UNAVAILABLE: 'AI unavailable',
  },
};

export const reviewDemoText: TextBundle<typeof id> = { id, en };

