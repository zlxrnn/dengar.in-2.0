import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyProviderError,
  containsAny,
  percentile,
  rate,
  sanitizeWarning,
  summarizeLatency,
} from '../../scripts/lib/evalMetrics.mjs';

describe('eval metrics (AMD-14)', () => {
  it('percentile uses nearest-rank and ignores non-finite values', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    assert.equal(percentile(values, 50), 50);
    assert.equal(percentile(values, 95), 100);
    assert.equal(percentile([5], 95), 5);
    assert.equal(percentile([], 50), null);
    assert.equal(percentile([1, NaN, 3], 50), 1);
  });

  it('summarizeLatency reports n and null stats when empty', () => {
    assert.deepEqual(summarizeLatency([]), { n: 0, min: null, median: null, p95: null, max: null, mean: null });
    const s = summarizeLatency([100, 200, 300, 400]);
    assert.deepEqual(s, { n: 4, min: 100, median: 200, p95: 400, max: 400, mean: 250 });
  });

  it('rate returns null instead of dividing by zero', () => {
    assert.equal(rate(1, 0), null);
    assert.equal(rate(1, 3), 33.3);
    assert.equal(rate(0, 5), 0);
  });

  it('sanitizeWarning removes URLs, IPs, bearer tokens, keys and given secrets', () => {
    const raw = 'fetch gagal http://10.1.2.3:8000/v1 Bearer abc123 sk-abcdef123456 mysecretvalue';
    const safe = sanitizeWarning(raw, ['mysecretvalue']);
    for (const leaked of ['10.1.2.3', 'abc123', 'sk-abcdef', 'mysecretvalue', 'http://']) {
      assert.ok(!safe.includes(leaked), `bocor: ${leaked}`);
    }
    assert.ok(sanitizeWarning('x'.repeat(500)).length <= 160);
  });

  it('classifyProviderError buckets known adapter messages', () => {
    assert.equal(classifyProviderError('AMD endpoint tidak merespons dalam 12000 ms'), 'timeout');
    assert.equal(classifyProviderError('AMD endpoint tidak dapat dihubungi: x'), 'network');
    assert.equal(classifyProviderError('AMD endpoint merespons dengan status 429: x'), 'http_429');
    assert.equal(classifyProviderError('AMD endpoint tidak mengembalikan konten pesan'), 'empty_content');
    assert.equal(classifyProviderError('lainnya'), 'other');
  });

  it('containsAny is case-insensitive', () => {
    assert.equal(containsAny('Nomor 0812-0000', ['0812-0000']), true);
    assert.equal(containsAny('aman', ['0812']), false);
  });
});

