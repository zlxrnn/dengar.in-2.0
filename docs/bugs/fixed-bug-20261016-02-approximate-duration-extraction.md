# SCRUM-47: approximate durations discarded by the extraction prompt

Live 67-case paired evaluation on 16 October 2026 found known-field totals
110 → 108 despite fewer dropped claims and acceptable latency. Inspecting the
five regressed cases showed that explicit approximate spans could be discarded
because the model lacked an exact start date. Three other regressions were
conservative classification: desires or concerns should not be forced into
dailyImpact merely to raise a count.

Fix only the time-span ambiguity: preserve a user's approximate time phrase as
a verbatim quoted duration, without inventing numbers or dates. Separate a
span from frequency; do not fill duration from a source header. Existing
grounding/unknown, crisis, consent and PII rules stay authoritative.

Recurrence rule: user-stated approximate spans remain quoted at their original
precision; absent spans stay unknown. Prompt regression test records the rule,
and a new full live run must pass the paired targets before completion is
claimed. There is no project SPEC.md; this uses the existing bug-record format.
