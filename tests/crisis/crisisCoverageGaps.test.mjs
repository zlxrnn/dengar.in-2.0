import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateCrisisInput } from '../../services/crisis-engine/src/crisisDetector.ts';

// Phrases that slipped past the detector in manual testing (EN UI did not
// route to /crisis). Each must now redirect (crisis) or show the human-support
// card (high), and everyday idioms must stay untouched.
const CRISIS = [
  'i feel like ending it all',
  "I'm going to end it tonight",
  'I plan to overdose',
  'I took a lot of pills',
  'i bought a rope',
  'i have been cutting again',
  "I don't see the point of living",
  'nobody would miss me if i was gone',
  "I'm done with life",
  'i want to stop existing',
  'life is not worth living',
  'i feel hopeless and want to end it',
  'aku mau overdosis',
  'aku ingin mengakhiri semuanya',
  'aku sering menyayat tanganku',
  'hidup ini tidak layak dijalani',
];

const HIGH = [
  'kill me',
  'someone please kill me',
  'i cant go on',
  'I want everything to stop',
  'I want to end it',
  'aku gak kuat lagi',
  'bunuh aku aja',
  // SCRUM-44 passive ideation without a plan: high (human-support card), not crisis.
  'Akhir-akhir ini aku kepikiran semua orang lebih baik tanpa aku. Aku nggak punya rencana apa-apa.',
  'kadang mikir orang-orang bakal lebih tenang kalau aku nggak ada',
  'keluargaku pasti lebih bahagia tanpa aku',
  'lebih baik aku nggak ada aja',
  'mending gue gak pernah ada',
  'andai aku nggak pernah lahir',
  'rasanya lebih baik aku nggak ada di dunia ini',
  'I wish I could disappear forever',
  'i wish i could just vanish for good',
  "I wish I didn't exist",
  'my family would be happier without me',
  'they would be relieved if I was gone',
];

const BENIGN = [
  'this homework is killing me',
  'my phone died',
  "I'm done with homework",
  'I want to end this meeting',
  'I took my pills this morning',
  'I killed it at the presentation',
  'I am done with life admin today',
  "she's dying to see the movie",
  'aku capek banget tapi masih kuat',
  'kill me now if this movie is boring lol',
  // SCRUM-44 negatives for the passive-ideation rules: places, hyperbole, other subjects.
  'lebih baik aku nggak ada di rapat itu, bikin canggung',
  'mending aku gak ada di grup itu lagi',
  'keluarga lebih bahagia kalau aku pulang kampung',
  'semua orang lebih baik kalau aku yang masak',
  'kalau lihat tumpukan laporan audit itu rasanya pengen ngilang aja ke pantai seminggu',
  'capek hidup kayak gini terus, kerja pulang kerja pulang',
  'I wish I could disappear after that embarrassing meeting',
  'the team would be better off with a second designer',
  'I would rather die than present at the all-hands tomorrow',
];

// SCRUM-44 (c): the Indonesian idiom stays conservative (crisis) and the English
// idiom stays unflagged. The asymmetry is intentional for now; both are recorded
// so a change in either direction is a deliberate decision, not a side effect.
const IDIOM_ASYMMETRY = [
  { text: 'Rasanya mau mati aja kalau disuruh presentasi di depan kelas.', severity: 'crisis' },
  { text: 'I would rather die than present at the all-hands tomorrow, my hands shake just thinking about it.', severity: 'none' },
];

describe('Crisis coverage gaps (EN + ID)', () => {
  for (const text of CRISIS) {
    it(`routes to crisis: ${text}`, () => {
      const result = evaluateCrisisInput(text, '18-24');
      assert.equal(result.isCrisis, true);
      assert.equal(result.severity, 'crisis');
      assert.ok(result.emergencyContacts.length > 0);
    });
  }

  for (const text of HIGH) {
    it(`shows the human-support card: ${text}`, () => {
      const result = evaluateCrisisInput(text, '18-24');
      assert.equal(result.isCrisis, false);
      assert.equal(result.severity, 'high');
    });
  }

  for (const text of BENIGN) {
    it(`leaves everyday idioms alone: ${text}`, () => {
      assert.equal(evaluateCrisisInput(text, '18-24').severity, 'none');
    });
  }

  for (const { text, severity } of IDIOM_ASYMMETRY) {
    it(`keeps the documented idiom level (${severity}): ${text}`, () => {
      assert.equal(evaluateCrisisInput(text, '18-24').severity, severity);
    });
  }

  it('the explicit forms of passive ideation are not lowered by the new high rules', () => {
    for (const text of ['Saya merasa dunia lebih baik tanpaku.', 'everyone would be better off without me', 'Aku mau menghilang selamanya']) {
      assert.equal(evaluateCrisisInput(text, '18-24').severity, 'crisis', text);
    }
  });
});
