# SCRUM-24: public route consent coverage test drift

Found 16 October 2026 on main e665d5a by `npm test`.

Two assertions still expected only four public pages, even though `/review-demo`
and `/support-options` intentionally provide synthetic review and public help
without personal intake. The coverage test mistook both pages for protected
features and stopped the aggregate suite. This is test expectation drift;
production consent behavior is unchanged.

Fix: enumerate the two public routes explicitly, keep the exact-set assertion,
and assert that both pages contain no personal intake form, browser storage,
microphone acquisition or fetch. Every other route still requires the guard.
Existing dedicated review-demo tests additionally enforce synthetic fixtures.

Recurrence rule: new public information pages must update the explicit allowlist
and preserve the no-intake boundary; do not exempt arbitrary routes to get green
tests. There is no project SPEC.md; record the failure and invariant here using
the existing bug-record convention rather than introducing an unrelated spec.
