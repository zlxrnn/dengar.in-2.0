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
and gitignored. **Live candidate acceptance is pending; do not promote based on
the first failed comparison or unit tests alone.**
