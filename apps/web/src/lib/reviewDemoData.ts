/**
 * REVIEW DEMO DATA (AMD-12, /review-demo)
 *
 * Everything here is invented and hand-written for judges. It is NOT output of
 * any model, NOT a real person, and NOT connected to any clinical system. The
 * four public texts mirror tests/carebridge/fixtures.mjs (cases A, B, D, E).
 * Case C (high-risk) is never shown verbatim, per docs/DEMO_SCRIPT.md §1.
 *
 * Keep this file free of imports so tests can load it directly.
 */

export type Lang = 'id' | 'en';
export type LocalizedText = { id: string; en: string };

export type DemoState =
  | 'READY_FOR_USER_REVIEW'
  | 'NEEDS_CLARIFICATION'
  | 'IMMEDIATE_HELP_SCREEN'
  | 'PROVIDER_UNAVAILABLE';

export interface DemoField {
  label: LocalizedText;
  value: string;
  /** Exact quote from the demo input that supports `value`. */
  quote: string;
}

export interface ReviewDemoCase {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  title: LocalizedText;
  state: DemoState;
  /** Synthetic input as shown. Null for case C: never displayed. */
  input: string | null;
  /** Case D: input after redaction preview. */
  redactedInput?: string;
  fields: DemoField[];
  unknowns: string[];
  clarification?: string;
  /** What a reviewer should notice. */
  notice: LocalizedText;
}

export const REVIEW_DEMO_NOTICES: {
  synthetic: LocalizedText;
  noRealIntake: LocalizedText;
  noClinical: LocalizedText;
  notModelOutput: LocalizedText;
} = {
  synthetic: {
    id: 'DATA SINTETIS. Semua kasus di halaman ini karangan, bukan orang atau pasien sungguhan.',
    en: 'SYNTHETIC DATA. Every case on this page is invented. No real person or patient.',
  },
  noRealIntake: {
    id: 'Halaman ini tidak menerima cerita atau data sensitif nyata. Tidak ada kolom isian, dan tidak ada yang dikirim atau disimpan.',
    en: 'This page accepts no real stories or sensitive data. There is no input field, and nothing is sent or stored.',
  },
  noClinical: {
    id: 'Tidak ada integrasi klinis. Tidak terhubung ke rekam medis, klinisi, atau mitra mana pun, dan tidak ada akses staf produksi. Berbagi data nyata dengan mitra di luar cakupan demo ini.',
    en: 'No clinical integration. Not connected to any medical record, clinician or partner, and there is no production staff access. Real data sharing with partners is out of scope for this demo.',
  },
  notModelOutput: {
    id: 'Hasil di bawah ditulis tangan untuk ilustrasi, bukan keluaran model AI dan bukan bukti kualitas model. Hasil evaluasi nyata ada di docs/eval.',
    en: 'Results below are hand-written for illustration. They are not AI model output and not evidence of model quality. Real evaluation results live in docs/eval.',
  },
};

export const REVIEW_CHECKLIST: LocalizedText[] = [
  { id: 'Setiap fakta punya kutipan dari cerita', en: 'Every fact has a quote from the story' },
  { id: 'Tidak ada label diagnosis atau persentase keyakinan', en: 'No diagnosis labels or confidence percentages' },
  { id: 'Yang tidak diketahui ditulis sebagai tidak diketahui', en: 'What is not known is stated as unknown' },
];

export const REVIEW_DEMO_CASES: readonly ReviewDemoCase[] = [
  {
    id: 'A',
    title: { id: 'Stres mahasiswa', en: 'Student stress' },
    state: 'READY_FOR_USER_REVIEW',
    input:
      'Aku kewalahan dengan tugas kuliah. Kalau deadline berdekatan, aku sulit fokus. Aku belum tahu gimana menjelaskan ini saat minta bantuan.',
    fields: [
      {
        label: { id: 'Kekhawatiran', en: 'Concern' },
        value: 'Kewalahan dengan tugas kuliah',
        quote: 'Aku kewalahan dengan tugas kuliah',
      },
      {
        label: { id: 'Dampak harian', en: 'Daily impact' },
        value: 'Sulit fokus saat deadline berdekatan',
        quote: 'Kalau deadline berdekatan, aku sulit fokus',
      },
    ],
    unknowns: ['Sejak kapan hal ini dirasakan'],
    notice: {
      id: 'Durasi tidak disebut, jadi ditulis tidak diketahui, bukan ditebak.',
      en: 'Duration was not stated, so it is shown as unknown, not guessed.',
    },
  },
  {
    id: 'B',
    title: { id: 'Informasi tidak pasti', en: 'Uncertain information' },
    state: 'NEEDS_CLARIFICATION',
    input: 'Aku sering ngerasa nggak baik, entah kenapa.',
    fields: [
      {
        label: { id: 'Kekhawatiran', en: 'Concern' },
        value: 'Sering merasa tidak baik tanpa tahu sebabnya',
        quote: 'Aku sering ngerasa nggak baik, entah kenapa',
      },
    ],
    unknowns: ['Sejak kapan hal ini dirasakan', 'Seberapa sering dan seberapa berat'],
    clarification: 'Kalau boleh tahu, kapan biasanya perasaan nggak baik itu paling terasa?',
    notice: {
      id: 'Satu pertanyaan klarifikasi saja. Tidak ada durasi, tingkat keparahan, atau persentase yang dikarang.',
      en: 'One clarification question only. No invented duration, severity or percentage.',
    },
  },
  {
    id: 'C',
    title: { id: 'Jalur bantuan segera', en: 'Immediate help path' },
    state: 'IMMEDIATE_HELP_SCREEN',
    input: null,
    fields: [],
    unknowns: [],
    notice: {
      id: 'Input berisiko tinggi dari fixture terkontrol, sengaja tidak ditampilkan. Aturan deterministik berjalan sebelum model apa pun; layar bantuan menggantikan catatan. Sistem tidak pernah menyatakan risiko sudah teratasi.',
      en: 'High-risk input from a controlled fixture, deliberately not shown. Deterministic rules run before any model; the help screen replaces the note. The system never claims the risk is resolved.',
    },
  },
  {
    id: 'D',
    title: { id: 'Data pribadi disamarkan', en: 'Personal data redacted' },
    state: 'READY_FOR_USER_REVIEW',
    input: 'Aku Raka, nomorku 0812-0000-1234 dan emailku raka.contoh@example.com. Aku stres karena target penjualan bulan ini.',
    redactedInput: 'Aku Raka, nomorku [NOMOR_TELEPON] dan emailku [EMAIL]. Aku stres karena target penjualan bulan ini.',
    fields: [
      {
        label: { id: 'Kekhawatiran', en: 'Concern' },
        value: 'Stres karena target penjualan bulan ini',
        quote: 'Aku stres karena target penjualan bulan ini',
      },
    ],
    unknowns: ['Sejak kapan hal ini dirasakan'],
    notice: {
      id: 'Nomor dan email disamarkan sebelum pemrosesan AI. Redaksi nama bersifat best-effort: "Raka" tidak terdeteksi pola saat ini, jadi pengguna harus memeriksa sendiri.',
      en: 'Phone and email are redacted before any AI processing. Name redaction is best-effort: "Raka" is not caught by the current patterns, so the user must check it.',
    },
  },
  {
    id: 'E',
    title: { id: 'Penyedia AI tidak tersedia', en: 'AI provider unavailable' },
    state: 'PROVIDER_UNAVAILABLE',
    input:
      'Aku kewalahan dengan tugas kuliah. Kalau deadline berdekatan, aku sulit fokus. Aku belum tahu gimana menjelaskan ini saat minta bantuan.',
    fields: [],
    unknowns: [],
    notice: {
      id: 'Saat AI tidak terjangkau, tidak ada ringkasan tiruan. Pengguna mendapat kerangka catatan manual dan tombol coba lagi.',
      en: 'When AI is unreachable there is no fake summary. The user gets a manual note template and a retry button.',
    },
  },
];

