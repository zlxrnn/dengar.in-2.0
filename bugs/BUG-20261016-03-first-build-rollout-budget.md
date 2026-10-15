# SCRUM-24: first automatic VPS build exceeds the service budget

Observed 16 October 2026: the first `e665d5a` rollout spent roughly nine minutes
installing dependencies, two copying them and over thirteen in compilation/type
checks/page-data collection. The outer systemd TimeoutStartSec=30min terminated
the build before it finished. The known healthy `51b3d53` image continued serving.

Increase the service budget to 60 minutes in the template and on the VPS.
Do not replace the app before build/migrations/health checks succeed, or claim
this change reduces build/inference latency. The existing updater integration
tests already enforce healthy-release preservation on failed builds; validate
the unit with systemd-analyze and observe an actual completed rollout.

The failure mode is an undersized outer budget on a slow host, not an app
schema migration. No new application invariant or SPEC.md is introduced.
