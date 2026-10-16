# SCRUM-49: manual edits retain stale export approval

Discovered while validating SCRUM-15 on main f6b0270. Jira:
https://iqbaldovandraa.atlassian.net/browse/SCRUM-49

This new ticket concerns manual review invalidation. Historical security report
filenames containing SCRUM-49 predate this ticket and are not references to it.

Reproduction: decline AI, write a manual concern, tick the review checkbox,
then replace its content. Observed aria-checked stayed true and TXT export
remained available without approving the new text. The browser regression
failed with true !== false before the patch.

Cause: ManualNote field setters changed the passport while leaving the separate
reviewed state true. Invariant: each content edit revokes approval; MD/TXT
exports require an explicit review of the edited content. All five field
handlers now invalidate review in the same React update as the text change.

Verification: tests/browser/manualReviewInvalidation.test.mjs passes 10/10
cases (five fields × ID/EN) on Chromium 141.0.7390.37, mobile 390×844, reduced
motion. Every case verifies revoked checkbox state, hidden MD/TXT actions,
reapproval, actual downloads containing the new content, and zero API calls.
410 CareBridge tests, web lint and typecheck pass. All data is synthetic.
No live provider, deployment or complete manual journey sign-off is claimed.
Safety/feature-owner review is required before merge.
