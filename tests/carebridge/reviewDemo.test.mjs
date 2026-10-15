// AMD-12: /review-demo must stay explicitly synthetic, take no real intake, and
// make no clinical-integration claim.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REVIEW_DEMO_CASES, REVIEW_DEMO_NOTICES } from '../../apps/web/src/lib/reviewDemoData.ts';
import { GOLDEN_CASES } from './fixtures.mjs';

const pageSource = readFileSync(new URL('../../apps/web/src/app/review-demo/page.tsx', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../../apps/web/src/app/review-demo/layout.tsx', import.meta.url), 'utf8');

describe('Review demo: explicitly synthetic', () => {
  it('states synthetic data, no real intake and no clinical integration in both languages', () => {
    assert.match(REVIEW_DEMO_NOTICES.synthetic.id, /SINTETIS/);
    assert.match(REVIEW_DEMO_NOTICES.synthetic.en, /SYNTHETIC/);
    assert.match(REVIEW_DEMO_NOTICES.noRealIntake.id, /tidak menerima/);
    assert.match(REVIEW_DEMO_NOTICES.noRealIntake.en, /accepts no real/);
    assert.match(REVIEW_DEMO_NOTICES.noClinical.id, /Tidak ada integrasi klinis/);
    assert.match(REVIEW_DEMO_NOTICES.noClinical.en, /No clinical integration/);
    assert.match(REVIEW_DEMO_NOTICES.notModelOutput.en, /not AI model output/);
  });

  it('the page renders every notice and marks itself noindex', () => {
    for (const key of ['synthetic', 'noRealIntake', 'noClinical', 'notModelOutput']) {
      assert.ok(pageSource.includes(`REVIEW_DEMO_NOTICES.${key}`), `${key} tidak dirender`);
    }
    assert.match(layoutSource, /index: false/);
  });
});

describe('Review demo: no real intake', () => {
  it('has no text entry, form, or network call in the page', () => {
    assert.doesNotMatch(pageSource, /<textarea/i);
    assert.doesNotMatch(pageSource, /<form/i);
    assert.doesNotMatch(pageSource, /type="(text|email|tel|search|url|password)"/);
    assert.doesNotMatch(pageSource, /\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie/);
  });

  it('the only input is the local, unsent checklist checkbox', () => {
    const inputs = pageSource.match(/<input\b[^>]*>/g) ?? [];
    assert.equal(inputs.length, 1);
    assert.match(inputs[0], /type="checkbox"/);
  });
});

describe('Review demo: cases are synthetic and safe', () => {
  it('covers cases A-E exactly once', () => {
    assert.deepEqual(REVIEW_DEMO_CASES.map((c) => c.id), ['A', 'B', 'C', 'D', 'E']);
  });

  it('public texts match the golden fixtures', () => {
    for (const c of REVIEW_DEMO_CASES) {
      if (c.input === null) continue;
      const golden = GOLDEN_CASES.find((g) => g.id === c.id);
      assert.equal(c.input, golden.input, `kasus ${c.id} harus sama dengan fixture`);
    }
  });

  it('never shows the high-risk case C text', () => {
    const c = REVIEW_DEMO_CASES.find((x) => x.id === 'C');
    const golden = GOLDEN_CASES.find((g) => g.id === 'C');
    assert.equal(c.input, null);
    assert.equal(c.fields.length, 0);
    assert.ok(!JSON.stringify(REVIEW_DEMO_CASES).includes(golden.input));
  });

  it('case D redacts its phone and email, and shows only synthetic example identifiers', () => {
    const d = REVIEW_DEMO_CASES.find((x) => x.id === 'D');
    assert.match(d.input, /example\.com/);
    assert.doesNotMatch(d.redactedInput, /\d{4}-\d{4}|@/);
    assert.match(d.redactedInput, /\[NOMOR_TELEPON\]/);
    assert.match(d.redactedInput, /\[EMAIL\]/);
  });

  it('every fact quote appears verbatim in its case input', () => {
    for (const c of REVIEW_DEMO_CASES) {
      for (const f of c.fields) assert.ok(c.input.includes(f.quote), `${c.id}: kutipan tidak ada di input`);
    }
  });

  it('shows no diagnosis labels, confidence percentages, or provider claims', () => {
    const text = JSON.stringify(REVIEW_DEMO_CASES);
    assert.doesNotMatch(text, /depresi|gangguan|adhd|anxiety disorder|diagnos(is|e)d?\b(?!\s+labels)/i);
    assert.doesNotMatch(text, /\d+\s?%/);
    assert.doesNotMatch(text, /MI300X|AMD Instinct|latensi|latency/i);
  });
});

