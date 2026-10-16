# SCRUM-47 — Live paired extraction evaluation, 16 October 2026

Main under test: `e665d5a`. Model: `tokenfactory:DeepSeek-V4-Flash`, currently
available in AMD TokenFactory. These results do not establish Gemma quality or
execution on a self-hosted ROCm GPU. All 67 inputs are synthetic evaluation
cases, unchanged between runs.

## Historical prompt comparison

Evaluation-only system prompts extracted from `7312751` (before) and `86fa645`
(after), before the self-help catalog, isolate extraction/calibration wording
from the subsequent self-help feature. Shared configuration: JSON mode,
8192 maximum tokens, 60-second timeout, 750 ms between calls, no automatic
retry. Both complete reports have zero unavailable/invalid outputs. The runs
overlapped and began 19:40:21 and 19:43:13 UTC on 15 October (16 October WIB);
gateway load can confound latency. They are not production latency benchmarks.

Twelve deterministic crisis/urgent cases had no model call and are explicitly
excluded from completeness comparison. On the same 55 valid paired passports:

| Metric | Before | After | Target |
|---|---:|---:|---|
| Known core fields, total | 110 | 108 | **Fail**, must increase |
| Dropped claims | 3 | 2 | Pass, must not increase |
| p50 provider latency | 17,455 ms | 17,733 ms | Pass, +1.59% ≤ 10% |

Three cases improved, five regressed and 47 were unchanged. Indonesian totals
74 → 72; English 36 → 36. The before prompt matched expected state on 62/67
cases; that state metric is separate from core-field completeness. Counts of
known fields do not measure all facts, semantic entailment, or clinical quality.
The initial comparison metadata is attached to Jira as attachment 10014.

## Candidate refinement

Inspection found explicit approximate time spans discarded because the model
did not know an exact start date. Preserve the user's phrase at its original
precision, e.g. a qualitative span; do not invent numbers, dates or a start
point. Separate frequency from span. Do not force desires/concerns into
dailyImpact merely to improve a count. Source-header dates still cannot supply
duration, and existing crisis, consent, redaction and grounding rules remain.

The runtime prompt remains within the existing 9000-character budget (8895).
The matching evaluation-only historical after prompt is 5785 characters, with
only this duration clarification added. A fresh complete 67-case run is required
before an improvement claim. The earlier baseline is reused, so elapsed time
and a different concurrency/load window remain limitations.

Verification: CareBridge 392/392 tests pass, including golden fixtures, duration
wording/precision, source-boundary and grounding checks. Raw reports stay local
and gitignored.

## Refined candidate: live acceptance passed

The complete rerun began 20:03:30 UTC on 15 October (03:03:30 WIB on 16 October),
using the identical model, dataset and limits. One provider-unavailable case
(`v1-mod-14`, actual HTTP 429) is reported explicitly and excluded together with the 12
deterministic gate cases. On the same 54 valid pairs in both runs:

| Metric | Before | Refined | Target |
|---|---:|---:|---|
| Known core fields, total | 108 | 119 | **Pass** |
| Dropped claims | 3 | 1 | **Pass** |
| p50 provider latency | 17,243 ms | 16,348 ms | **Pass**, −5.19% |

Twelve cases improved, one regressed and 41 were unchanged. These baseline
numbers differ from the first table because the comparison excludes the one
additional unavailable case from **both** sides; no different-case totals are
compared. The unavailable case is not treated as a quality success, nor is the
54-case subset described as all 67 producing valid passports.

All three measured acceptance targets pass on this synthetic corpus. The
comparison metadata includes per-language/per-band figures, prompt hashes and
excluded IDs. The original and refined reports are kept separately. This is
one iterative development evaluation, not independent holdout evidence or a
guarantee of model quality; the earlier baseline and changed gateway load are
still latency limitations. Production promotion remains subject to PR review.
