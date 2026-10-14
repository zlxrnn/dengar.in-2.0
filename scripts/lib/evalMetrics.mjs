/**
 * Pure helpers for scripts/eval-carebridge.mjs (AMD-14). No I/O, no network,
 * so they can be unit-tested (tests/carebridge/evalMetrics.test.mjs).
 */

/** Nearest-rank percentile (p in 0..100). Returns null for an empty list. */
export function percentile(values, p) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}

/** min / median / p95 / max / mean in ms, rounded; all null when n = 0. */
export function summarizeLatency(values) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { n: 0, min: null, median: null, p95: null, max: null, mean: null };
  const sum = finite.reduce((a, b) => a + b, 0);
  return {
    n: finite.length,
    min: Math.round(Math.min(...finite)),
    median: Math.round(percentile(finite, 50)),
    p95: Math.round(percentile(finite, 95)),
    max: Math.round(Math.max(...finite)),
    mean: Math.round(sum / finite.length),
  };
}

/** Percentage with one decimal, or null when the denominator is 0. */
export function rate(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Makes a pipeline/provider warning safe to store: drops URLs, IPs, bearer
 * tokens and key-like strings, and caps the length. Warnings never contain
 * user text by design, but a provider error body might echo anything.
 */
export function sanitizeWarning(warning, secrets = []) {
  let safe = String(warning);
  for (const secret of secrets) {
    if (secret && secret.length >= 4) safe = safe.split(secret).join('[redacted]');
  }
  safe = safe
    .replace(/Bearer\s+[^\s"',]+/gi, 'Bearer [redacted]')
    .replace(/https?:\/\/[^\s"',)]+/gi, '[url]')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '[ip]')
    .replace(/\b(?:sk|rc|hf)[-_][A-Za-z0-9_-]{8,}/g, '[key]')
    .replace(/\s+/g, ' ')
    .trim();
  return safe.length > 160 ? `${safe.slice(0, 157)}...` : safe;
}

/** Buckets a failed provider call for the failure-rate breakdown. */
export function classifyProviderError(message) {
  const text = String(message).toLowerCase();
  if (text.includes('tidak merespons')) return 'timeout';
  if (text.includes('tidak dapat dihubungi')) return 'network';
  const status = /status (\d{3})/.exec(text);
  if (status) return `http_${status[1]}`;
  if (text.includes('tidak mengembalikan konten')) return 'empty_content';
  return 'other';
}

/** True when `text` contains any of the given identifier strings (case-insensitive). */
export function containsAny(text, needles) {
  const haystack = String(text).toLowerCase();
  return needles.some((needle) => haystack.includes(String(needle).toLowerCase()));
}

