import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCarePassportExport, openingLinesExportText } from '../../apps/web/src/lib/carePassportExport.ts';

const payload = '[Portal](https://phishing.invalid) ![img](https://tracking.invalid/a) <script>alert(1)</script>\n# Fake heading';
const field = { value: payload, source: 'user_input' };
const passport = {
  version: 1,
  reviewStatus: 'user_approved',
  concerns: [field], dailyImpact: [field], duration: field, relevantContext: [field],
  questionsForProfessional: [payload], unknowns: [payload], disclaimer: payload,
  selfHelp: [{ cardId: 'jadwal-tidur-konsisten', reasonQuote: payload }],
};

test('user text cannot introduce Markdown links, images, HTML or extra block headings', () => {
  const md = buildCarePassportExport(passport, { format: 'md', provenanceLabel: payload });
  assert.doesNotMatch(md, /(?<!\\)\[Portal\]\(|(?<!\\)!\[img\]\(|<script>|\n# Fake heading/);
  assert.ok(md.includes('\\[Portal\\](https://phishing.invalid)'));
  assert.ok(md.includes('\\<script\\>'));
  // All user-controlled export surfaces use the same literal-text boundary.
  assert.equal(md.split('\\[Portal\\]').length - 1, 9);
});

test('plain-text export preserves the approved text verbatim', () => {
  const txt = buildCarePassportExport(passport, { format: 'txt', provenanceLabel: payload });
  assert.ok(txt.includes(payload));
  assert.equal(txt.split(payload).length - 1, 9);
  assert.ok(!txt.includes('\\[Portal\\]'));
});

test('escaping also handles reference links, code, backslashes and table delimiters', () => {
  const value = '[label][ref] `code` **bold** _italic_ \\ | cell';
  const md = buildCarePassportExport({ ...passport, concerns: [{ value }], selfHelp: [] }, { format: 'md' });
  assert.ok(md.includes('\\[label\\]\\[ref\\] \\`code\\` \\*\\*bold\\*\\* \\_italic\\_ \\\\ \\| cell'));
  for (const value of ['1. nested list', '1) nested list']) {
    const exported = buildCarePassportExport({ ...passport, concerns: [{ value }], selfHelp: [] }, { format: 'md' });
    assert.ok(exported.includes(`- 1\\${value.slice(1)}`), 'numbered text must not introduce a nested list');
  }
});

test('trusted knowledge-base attribution links and approval gate are preserved', () => {
  const md = buildCarePassportExport(passport, { format: 'md' });
  assert.ok(md.includes('https://www.cdc.gov/'));
  assert.equal(buildCarePassportExport({ ...passport, reviewStatus: 'draft' }, { format: 'md' }), null);
});

test('editable opening lines cannot reintroduce markup in the export appendix', () => {
  const selection = { destinationLabel: payload, lines: [payload], provenance: { isAmd: false, isFallback: false, providerId: payload } };
  const md = openingLinesExportText(selection, 'md');
  assert.doesNotMatch(md, /(?<!\\)\[Portal\]\(|<script>|\n# Fake heading/);
  assert.equal(md.split('\\[Portal\\]').length - 1, 3);
  assert.ok(openingLinesExportText(selection, 'txt').includes(payload));
  assert.equal(openingLinesExportText({ ...selection, lines: [] }, 'md'), '');
});
