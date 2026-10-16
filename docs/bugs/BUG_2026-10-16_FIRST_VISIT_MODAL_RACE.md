# SCRUM-22: first-visit privacy warning inherits navigation inert

Baseline: main f6b0270, Chromium 141.0.7390.37.

Open the mobile menu within the first 600 ms on a fresh visit. The drawer
makes its background inert, including the main ancestor of the delayed
privacy warning. The warning then appears but its confirmation cannot focus.
The original four menu tests pre-dismissed the warning and missed this race.

The warning dispatches its opening event before becoming visible. The
navigation closes in the same React update, restoring background inert
before the warning's focus effect. Neither consent nor privacy copy changes.

Regression: firstVisitModal.test.mjs failed at all four original viewport /
language combinations before the fix. The fixed suite covers eight cases
(390/768 px, ID/EN, 100/140% text); all pass. The four existing menu tests
also pass. Verify focus containment, Escape, focus restoration, restored
scroll and no inert warning. See docs/eval/A11Y_AUDIT_REPORT_2026-10-16.md.

Radit and Release Owner review are required before merge.
