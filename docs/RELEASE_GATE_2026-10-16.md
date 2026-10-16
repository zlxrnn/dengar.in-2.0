# SCRUM-24 — Release gate, 16 October 2026

Historical verification source: main `e665d5a`, plus the original test-only
consent-coverage correction. These counts describe that earlier checkout, not
the current main revision. The application build then used main code unchanged. Synthetic QA data
only. Vercel remains excluded per the deployment migration decision.

## Automated verification

| Check | Result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | Pass |
| `npm test` | Pass: 890 node:test cases, 0 failures, 0 skips; Redis integration 14/14 |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass, Next 15.5.25 production build |
| Mobile browser QA | 8/8, 390×844, Brave/Chromium; screenshot/report attachment 10010 on SCRUM-20 |
| Voice browser QA | 3/3; screenshot/report attachment 10011 on SCRUM-23; 49 automated voice tests included above |

The first aggregate test run found two stale consent-route assertions. The
original proposal allowed both synthetic review and static support pages.
Main PR #11 subsequently chose a guard for the interactive `/review-demo`;
`/support-options` remains public static help. This branch now retains main's
full consent tests and guarded demo behavior, superseding the earlier allowlist
proposal. Cause and recurrence rule:
`bugs/BUG-20261016-01-public-route-consent-test.md`.

Raw test logs remain local QA artifacts. Browser summaries record UTC timestamps
around 19:40 on 15 October (02:40 WIB on 16 October). Mobile chat success uses
a controlled response; it is not represented as live AI evidence. Native
microphone denial was tested in ID/EN; transcripts were controlled. The user
separately reported successful voice operation on a physical phone, with device,
browser and tested revision unspecified.

## Deployment and live provider evidence

Public URL: <https://dengar-in.vertalt.my.id>. HTTPS verification and public
`/api/health` returned healthy with Redis up. VPS app, PostgreSQL and Redis are
healthy; four migrations applied. Automatic GitHub-main update timer is active.
PRs #4 and #5 contain the merged deployment changes. Build-before-replacement
keeps the active application serving during subsequent builds.

The first automatic build of `e665d5a` exceeded the outer 30-minute systemd
budget while collecting page data. The active `51b3d53` app remained healthy;
no unfinished image was deployed. Increase that outer budget to 60 minutes for
this host and verify the next rollout. This permits the cold build to complete;
it does not make compilation faster or establish an application latency pass.

The retry also logged socket-hang-up retries during compilation. The root
layout used `next/font/google`, whose font-resource downloader retries external
requests at build time. Bundle the same Schibsted Grotesk variable font locally
with `next/font/local`; retain weight range 600–800, swap display and the existing
CSS variable. Font source is pinned to Google Fonts commit
`1d0e46c7933245c8180fe83e47917961c913bbdb`, with hashes and the SIL OFL 1.1 license
under `apps/web/src/app/fonts/`; a public license copy is also provided.

The WOFF2 retains full glyph coverage and is 70,032 bytes. App compilation was
verified with Docker RUN-step networking disabled and an imported preinstalled
dependency stage. Installing npm dependencies itself still requires the
registry/cache; this does not claim a fresh install can run without network.
The active VPS remains on its healthy image until a reviewed main update is
successfully built and rolled out.

Post-font Linux/amd64 image smoke passed: mobile 8/8 and voice browser 3/3,
same-origin WOFF2 HTTP 200, weight 700 heading rendered at 390×844 without
horizontal overflow, health HTTP 200 and public font-license HTTP 200.
Browser summaries began 20:32:13 / 20:32:14 UTC; font smoke at 20:33:36 UTC.

The recorded live public consultation returned HTTP 200,
`READY_FOR_USER_REVIEW`, provider `amd:DeepSeek-V4-Flash`, no validation warnings,
and inference latency 22,973 ms. This is live AMD gateway evidence, not a mock
and not evidence of self-hosted Gemma/ROCm. Total request was 39,379 ms; no claim
that a latency target has been met. The former Gemma model is absent from the
available gateway catalog; training is separately tracked by SCRUM-48, due
18 October, and remains draft while credit access is pending.

Fault-injection staging and paired prompt evaluation are tracked separately in
SCRUM-33 and SCRUM-47; their live outcomes must be recorded before those tickets
are called complete. No production fault settings are changed for these tests.

## Source provenance and licenses

- Application source is the pre-existing Dengar.in repository, continued at
  `zlxrnn/dengar.in-2.0`, with history retained. This release does not claim the
  entire app was written during the hackathon. Root `LICENSE` is MIT, copyright
  2026 Dengar.in Team.
- PR #1 delivered the test bench/CareBridge hardening; #2 delivered synthetic
  evaluation data, escalation calibration and self-help; #3 delivered paired
  prompt measurement; #4/#5 deployment; #7 voice delivery; #6 Gemma draft.
- Evaluation stories are team-authored synthetic examples, not scraped or
  production conversations. Knowledge-base text is paraphrased/adapted from
  sources recorded per card in `packages/config/src/selfHelpCards.v1.json` and
  `docs/CAREBRIDGE_KNOWLEDGE_BASE.md`; the root MIT license does not relicense
  third-party knowledge-base content.
- Bundled Schibsted Grotesk is separately licensed under SIL OFL 1.1. Font
  copyright/license and source provenance accompany the asset; it is not
  relicensed by the application's MIT LICENSE.
- The user confirmed completion of the pending final Safety/QA and product/
  reuse checks on 16 October. Jira records that as user-reported confirmation,
  rather than an independent legal or reviewer determination by this agent.

Lockfile/license metadata audit: 504 external package entries, including optional
platform packages. Counts: MIT 396; Apache-2.0 41; ISC 32; BSD-2-Clause 9;
BSD-3-Clause 4; BlueOak-1.0.0 2; LGPL-3.0-or-later 10; combined
Apache/LGPL/MIT expressions 4; Python-2.0, MPL-2.0, CC-BY-4.0, CC0-1.0,
0BSD and MIT-or-CC0 expressions one each. Nine workspace entries have no own
license metadata and are first-party source under the repository LICENSE.
No external lockfile entry was missing declared license metadata in this audit.

Special cases reviewed: optional `@img/sharp-libvips-*` packages include bundled
libraries and LGPL notices, development dependency `axe-core` declares MPL-2.0,
and `caniuse-lite` declares CC-BY-4.0. Keep upstream license/notice files with
dependencies and redistributed artifacts. This is a declared-license inventory,
not a claim that every transitive binary's obligations are discharged by a
single package.json field. The [sharp-libvips upstream notices](https://github.com/lovell/sharp-libvips/blob/main/THIRD-PARTY-NOTICES.md)
describe bundled libraries; [axe-core LICENSE](https://github.com/dequelabs/axe-core/blob/develop/LICENSE)
records its terms. The existing Docker image retains the dependency tree rather
than stripping package notices.

Tracked environment examples were inspected: `.env.example` has 28 assignments,
with only the timeout nonempty; `deploy/vps/secrets.env.example` has 15, with only
model/JSON-mode/timeout defaults nonempty. Credential fields are empty. Runtime
secret files and raw evaluation reports are excluded from this PR.

## Integration follow-up, 16 October 2026

Merge origin/main `8cb7669` into PR #8. Preserve all tests and the review-demo
consent guard delivered by PR #11. Remaining release changes are the bundled
font/provenance, outer deployment budget, and historical release evidence.
Current verification results are recorded in the PR after the final merged
checkout is tested; earlier browser, live-provider, dependency-license counts
and VPS rollout observations above remain historical evidence. No new hosted
rollout or live model evaluation is implied by resolving the merge conflict.

Final local checks after conflict resolution: clean `npm ci` PASS; `npm test`
919 node:test PASS / 0 fail / 0 skipped, Redis 14/14; lint, typecheck and
production build PASS. Chromium 141.0.7390.37 production smoke on `/crisis` at
390×844: HTTP 200, no horizontal overflow, local display font loaded at weight
700, same-origin WOFF2 HTTP 200 with the pinned SHA-256, public OFL license HTTP
200. Both license copies are byte-identical to the previously bundled source.
These are local results; no production rollout was performed in this follow-up.
