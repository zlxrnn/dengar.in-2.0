# SCRUM-33 — Isolated hosted fault QA

`scripts/testbench/hostedFaults.mjs` runs only in a disposable Docker staging
network. It never changes production provider configuration and publishes no
ports. The existing production image is reused; database and Redis connections
are disabled in the staging app.

Use two containers named `dengarin-qa-scrum33-proxy` and
`dengarin-qa-scrum33-web` on an isolated network. Mount the runner at
`/qa/runner.mjs` and a writable metadata output directory at `/qa`.

- Proxy command: `node /qa/runner.mjs proxy`. Supply server-only `AMD_BASE_URL`
  and `AMD_API_KEY` through a root-readable environment file, never command-line
  values or a tracked file.
- Staging app: direct Next startup from the deployed image, with
  `AMD_BASE_URL=http://dengarin-qa-scrum33-proxy:8080/v1`, a synthetic app key,
  JSON mode, a valid model ID and `AMD_TIMEOUT_MS=12000`. Keep other providers,
  database and Redis unset.
- After the app is ready and warm, run `node /qa/runner.mjs` inside the proxy
  container. Node must have write access to `/qa/report.json`.

The invalid-key and invalid-model cases contact real AMD and require actual
upstream 401 and 400/404 respectively. 429, 503 and hang are injected. Crisis and
declined consent must produce zero proxy calls. Assertions require no passport,
provider `none`, `isAmd: false`, expected state and exact call count. Metadata
records response latency; it does not claim end-to-end latency equals the
provider timeout. Request bodies and credentials are never logged.

The initial VPS cold-start run exceeded the harness's 25-second request bound.
After warming the app and raising the staging app CPU allowance from 0.5 to 2,
all seven scenarios passed. This is not represented as an infrastructure
performance pass. The production image under test was main `51b3d53`; subsequent
main changes through `e665d5a` affect deployment startup, voice and training docs,
not the Care Passport fault flow. A live successful public AMD consultation is
recorded separately in SCRUM-24.

After copying the report, remove only these two staging containers, their
private network and the temporary provider environment file. Preserve
production containers, volumes, network and secrets. Never run global prune.
