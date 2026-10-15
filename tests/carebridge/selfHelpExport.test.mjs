// SCRUM-45: the local export carries the self-help cards the user kept, with
// the knowledge-base text, source/licence lines and the adaptation disclaimer
// for CC BY-NC-SA (WHO) material. Still nothing before user approval.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCarePassportExport } from '../../apps/web/src/lib/carePassportExport.ts';
import { carePassportText } from '../../apps/web/src/i18n/pages/carePassport.ts';
import { getSelfHelpCard } from '../../packages/config/src/selfHelpCards.ts';

const when = new Date('2026-10-15T03:00:00Z');
const base = {
  version: 1,
  subject: 'anonymous_adult',
  concerns: [{ value: 'Susah tidur', source: 'user_input', sourceQuote: 'susah tidur', needsReview: false }],
  dailyImpact: [],
  duration: { value: null, source: 'unknown', needsReview: false },
  relevantContext: [],
  questionsForProfessional: ['Apa yang bisa saya coba saat susah tidur?'],
  unknowns: [],
  disclaimer: 'Bukan diagnosis.',
  reviewStatus: 'user_approved',
};
const picks = [
  { cardId: 'jadwal-tidur-konsisten', reasonQuote: 'susah tidur' }, // CDC, public domain
  { cardId: 'napas-lambat-tiga-hitungan', reasonQuote: 'gampang panik' }, // WHO, CC BY-NC-SA
];

describe('Care Passport export: self-help steps (SCRUM-45)', () => {
  it('writes a "Langkah yang bisa dicoba" section with KB steps, reason quote, seek-help line and sources', () => {
    const md = buildCarePassportExport({ ...base, selfHelp: picks }, { format: 'md', generatedAt: when });
    const sleep = getSelfHelpCard('jadwal-tidur-konsisten');
    const breath = getSelfHelpCard('napas-lambat-tiga-hitungan');
    assert.ok(md.includes('## Langkah yang bisa dicoba'));
    assert.ok(md.includes(carePassportText.id.exportFile.selfHelp.intro));
    assert.ok(md.includes(`### ${sleep.title.id}`));
    assert.ok(md.includes('Kenapa ini: "susah tidur"'));
    sleep.steps.id.forEach((step, i) => assert.ok(md.includes(`${i + 1}. ${step}`), step));
    assert.ok(md.includes(`Kapan perlu bantuan profesional: ${sleep.seekHelpWhen.id}`));
    assert.ok(md.includes('Centers for Disease Control and Prevention (CDC), USA'));
    assert.ok(md.includes('domain publik, atribusi ke CDC'));
    assert.ok(md.includes(sleep.source.url));
    // WHO card: licence + adaptation disclaimer, cautions present.
    assert.ok(md.includes(`### ${breath.title.id}`));
    assert.ok(md.includes('World Health Organization'));
    assert.ok(md.includes('CC BY-NC-SA 3.0 IGO'));
    assert.ok(md.includes(carePassportText.id.exportFile.selfHelp.adapted));
    assert.ok(md.includes(`Perlu diingat: ${breath.cautions.id}`));
    // Section order: after the questions, before the closing note.
    assert.ok(md.indexOf('## Langkah yang bisa dicoba') > md.indexOf('## Pertanyaan untuk profesional'));
    assert.ok(md.indexOf('## Langkah yang bisa dicoba') < md.indexOf('## Catatan penting'));
  });

  it('the adaptation disclaimer appears only for CC BY-NC-SA cards', () => {
    const cdcOnly = buildCarePassportExport({ ...base, selfHelp: [picks[0]] }, { format: 'md', generatedAt: when });
    assert.ok(!cdcOnly.includes(carePassportText.id.exportFile.selfHelp.adapted));
    const whoOnly = buildCarePassportExport({ ...base, selfHelp: [picks[1]] }, { format: 'md', generatedAt: when });
    assert.ok(whoOnly.includes(carePassportText.id.exportFile.selfHelp.adapted));
  });

  it('omits the section when there are no picks or only unknown ids', () => {
    for (const selfHelp of [undefined, [], [{ cardId: 'kartu-hilang', reasonQuote: 'x' }]]) {
      const md = buildCarePassportExport({ ...base, selfHelp }, { format: 'md', generatedAt: when });
      assert.ok(!md.includes('Langkah yang bisa dicoba'), JSON.stringify(selfHelp));
    }
  });

  it('renders the section in English with the English card text when lang is en', () => {
    const md = buildCarePassportExport({ ...base, selfHelp: [picks[1]] }, { format: 'md', generatedAt: when, lang: 'en' });
    const breath = getSelfHelpCard('napas-lambat-tiga-hitungan');
    assert.ok(md.includes('## Things you can try'));
    assert.ok(md.includes(`### ${breath.title.en}`));
    assert.ok(md.includes(`1. ${breath.steps.en[0]}`));
    assert.ok(md.includes('Why this: "gampang panik"'));
    assert.ok(md.includes(carePassportText.en.exportFile.selfHelp.adapted));
    assert.ok(!md.includes(breath.steps.id[0]));
  });

  it('plain text uses upper-case card titles and no markdown markers', () => {
    const txt = buildCarePassportExport({ ...base, selfHelp: picks }, { format: 'txt', generatedAt: when });
    assert.ok(txt.includes(getSelfHelpCard('jadwal-tidur-konsisten').title.id.toUpperCase()));
    assert.ok(!txt.includes('### '));
    assert.ok(!txt.includes('## '));
  });

  it('still refuses to export before approval, even with picks', () => {
    assert.equal(buildCarePassportExport({ ...base, reviewStatus: 'user_pending', selfHelp: picks }, { format: 'md', generatedAt: when }), null);
  });

  it('builds local export without any network call', () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('should not be called');
    };
    try {
      const md = buildCarePassportExport({ ...base, selfHelp: picks }, { format: 'md', generatedAt: when });
      assert.ok(md);
      assert.equal(calls, 0);
    } finally {
      if (originalFetch) globalThis.fetch = originalFetch;
      else delete globalThis.fetch;
    }
  });

  it('i18n: every self-help key exists in both languages with the same shape (runtime check next to tsc)', () => {
    const shape = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'object' && v !== null ? shape(v) : typeof v]));
    assert.deepEqual(shape(carePassportText.en.review.selfHelp), shape(carePassportText.id.review.selfHelp));
    assert.deepEqual(shape(carePassportText.en.immediate.safetyPlan), shape(carePassportText.id.immediate.safetyPlan));
    assert.deepEqual(shape(carePassportText.en.exportFile.selfHelp), shape(carePassportText.id.exportFile.selfHelp));
    assert.equal(typeof carePassportText.en.exportFile.sections.selfHelp, 'string');
  });
});
