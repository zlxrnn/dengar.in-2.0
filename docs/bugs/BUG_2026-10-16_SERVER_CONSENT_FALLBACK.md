# SCRUM-35: server consent refusal displayed as provider outage

Baseline: main f6b0270. The local refusal path correctly opens a manual template
without API calls. However, showResult mapped every PROVIDER_UNAVAILABLE response
to an outage, including the documented ai_consent_declined warning. The UI then
showed a misleading outage explanation and offered AI retry using stale local
opt-in state.

Invariant: server consent refusal must show the declined manual template and
must not offer AI retry. An actual provider outage may still offer retry when
the local user opted in. Neither branch invents a passport.

The page now preserves the warning in both normal and defensive fallbacks.
Server consent enforcement and the crisis pipeline are unchanged.

Regression: tests/browser/consentFallback.test.mjs. Before patch, the two server
refusal cases failed (ID/EN), while four local-refusal/outage controls passed.
After patch, all six pass at 390×844 in Chromium 141.0.7390.37 with reduced
motion enabled for deterministic clicks. Provider responses are mocked; preview
uses the actual local API. This is not live-provider or deployed QA.

The tests also verify explicit review before export, downloaded TXT content,
and zero API calls on local refusal through manual writing and download.
410 CareBridge tests, web lint and typecheck pass. Safety Owner review remains
required for this consent-related UI change.
