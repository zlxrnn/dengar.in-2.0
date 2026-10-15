import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareCompleteness } from '../../scripts/testbench/compareCompleteness.mjs';

const row = (id, known, overrides = {}) => ({ id, band: 'moderate', lang: 'id',
  state: 'READY_FOR_USER_REVIEW', completenessKnown: known, droppedClaims: 0,
  providerCalls: 1, latencyMs: 100, ...overrides });
const report = (samples, overrides = {}) => ({ dataset: { count: samples.length, sha256: 'same' },
  config: { maxTokens: 8192, timeoutMs: 60000, jsonMode: true, delayMs: 750 },
  models: [{ model: 'tokenfactory:Gemma', samples }], ...overrides });

describe('SCRUM-47: paired completeness evidence', () => {
  it('pairs ids rather than positions and excludes outages and deterministic crisis results', () => {
    const before = report([row('a', 1), row('b', 3), row('crisis', null, { state: 'IMMEDIATE_HELP_SCREEN', providerCalls: 0 }), row('failed', null, { state: 'PROVIDER_UNAVAILABLE' })]);
    const after = report([row('b', 2, { latencyMs: 110 }), row('a', 3, { latencyMs: 110 }), row('failed', 3), row('crisis', null, { state: 'IMMEDIATE_HELP_SCREEN', providerCalls: 0 })]);
    const m = compareCompleteness(before, after).models[0];
    assert.equal(m.all.pairedCases, 2);
    assert.equal(m.all.knownBefore, 4);
    assert.equal(m.all.knownAfter, 5);
    assert.equal(m.all.improved, 1);
    assert.equal(m.all.regressed, 1);
    assert.equal(m.unavailableBefore, 1);
    assert.deepEqual(m.excludedCases, ['crisis', 'failed']);
    assert.deepEqual(m.all.targets, { completenessImproved: true, droppedClaimsNotIncreased: true, latencyWithinTenPercent: true });
    assert.equal(m.bands.moderate.pairedCases, 2);
    assert.equal(m.languages.id.pairedCases, 2);
  });
  it('reports regression and increased dropped claims independently of completeness gain', () => {
    const m = compareCompleteness(report([row('a', 1)]), report([row('a', 2, { droppedClaims: 1, latencyMs: 112 })])).models[0];
    assert.deepEqual(m.all.targets, { completenessImproved: true, droppedClaimsNotIncreased: false, latencyWithinTenPercent: false });
  });
  it('does not treat zero eligible cases as a pass', () => {
    const r = report([row('a', null, { state: 'PROVIDER_UNAVAILABLE' })]);
    assert.deepEqual(compareCompleteness(r, r).models[0].all.targets, {
      completenessImproved: null, droppedClaimsNotIncreased: null, latencyWithinTenPercent: null });
  });
  it('rejects mismatched datasets, configuration, model sets and missing cases', () => {
    const r = report([row('a', 1)]);
    assert.throws(() => compareCompleteness(r, { ...r, dataset: { count: 1, sha256: 'different' } }), /Dataset/);
    assert.throws(() => compareCompleteness(r, { ...r, config: { ...r.config, maxTokens: 1024 } }), /Config/);
    assert.throws(() => compareCompleteness(r, { ...r, models: [] }), /Model sets/);
    assert.throws(() => compareCompleteness(r, report([row('b', 1)])), /Case sets/);
  });
  it('rejects duplicate ids, changed labels and mock measurements', () => {
    const r = report([row('a', 1), row('b', 2)]);
    assert.throws(() => compareCompleteness(r, report([row('a', 1), row('a', 2)])), /Duplicate/);
    assert.throws(() => compareCompleteness(r, report([row('a', 1, { lang: 'en' }), row('b', 2)])), /labels/);
    const mock = { ...r, models: [{ model: 'mock:echo', samples: r.models[0].samples }] };
    assert.throws(() => compareCompleteness(mock, mock), /Mock/);
  });
  it('outputs only counts and metadata, even if full reports contain draft text', () => {
    const r = report([row('a', 1, { passport: { concerns: ['PRIVATE_DRAFT'] } })]);
    assert.ok(!JSON.stringify(compareCompleteness(r, r)).includes('PRIVATE_DRAFT'));
  });
});
