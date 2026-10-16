# SCRUM-24: consent coverage drift and integration resolution

Found 16 October 2026 on main e665d5a by `npm test`: assertions expected only
four public routes, while review-demo and support-options had no guard.
The original PR #8 proposed explicitly allowing both synthetic/public pages.

## Resolution after main PR #11

Main now deliberately guards the interactive `/review-demo` with useConsentGuard
and ConsentPending. `/support-options` remains public static help, alongside
`/`, `/consent`, `/crisis`, and `/resources`. During the PR #8 conflict resolution,
retain main's test file in full: exact public allowlist, no-private-intake checks,
and the explicit guarded/synthetic review-demo regression. Do not restore the
superseded six-route allowlist merely to make the tests pass.

Recurrence rule: public information routes must be explicitly listed and must
preserve the no-private-intake boundary. Interactive guarded routes must not be
exempted by unrelated release QA. There is no project SPEC.md; this record uses
the existing bug-record convention.
