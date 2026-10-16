# Deterministic crisis classification boundary

The rule engine runs before AI calls. Explicit self-harm or suicide language,
first-person permanent-disappearance euphemisms, and imminent intent are routed
to crisis support. History entries authored by users are screened as well as
the current message. Caller-supplied assistant entries are retained only as
unverified user-role quotations, and unknown roles are rejected before a
provider call.

Only a complete, explicit denial (for example, “Aku tidak mau bunuh diri”) or
a clearly framed third-person film/news discussion is exempted from the
crisis result. Mixed, quoted, educational, or otherwise ambiguous language
continues down the conservative crisis path. A `high` distress result is not
the same as `crisis` and does not by itself stop the AI path. The
regression corpus in `tests/crisis/crisisRegression.test.mjs` records the exact
boundary examples. These rules are not a clinical assessment and require
ongoing review by qualified Indonesian-language safety experts.

## Passive ideation without a plan (SCRUM-44, 15 Oct 2026)

Two rules, `passive-ideation` (ID) and `en-passive-ideation` (EN), return
`severity: 'high'` for perceived-burdensomeness and "better if I did not
exist" statements that carry no intent, plan, or means: "semua orang lebih
baik tanpa aku", "mereka lebih tenang kalau aku nggak ada", "lebih baik aku
nggak ada", "andai aku nggak pernah lahir", "I wish I could disappear
forever", "I wish I didn't exist", "my family would be happier without me".
Level `high` was chosen because the engine reserves `crisis` for explicit
intent, euphemisms for permanent disappearance, and means; these softer forms
previously matched nothing and were left to the model. For Care Passport,
`high` locks the result to `HUMAN_SUPPORT_RECOMMENDED` regardless of the
model; for chat it attaches the deterministic support pathway. Nothing was
lowered: "dunia lebih baik tanpaku", "aku ingin menghilang selamanya" and
"everyone would be better off without me" still return `crisis`. Approved as
part of the SCRUM-44 recommendations (disetujui Justin, dilaporkan YanIanZ
15 Okt 2026). Negatives kept out on purpose: a trailing place ("lebih baik aku
nggak ada di rapat itu"), hyperbole without "forever/for good" ("I wish I could
disappear after that meeting"), and other subjects ("the team would be better
off with a second designer"). Tests: `tests/crisis/crisisCoverageGaps.test.mjs`.

Idiom asymmetry, intentional for now: the Indonesian hyperbole "rasanya mau
mati aja kalau presentasi" matches `death-wish-phrase` and stays `crisis`
(conservative false positive), while the English "I would rather die than
present" matches no rule. Both levels are pinned by tests so that a change in
either direction is a deliberate decision.

The Care Passport urgent-request gate (`isUrgentHelpRequest` in
`services/orchestrator/src/carePassportPipeline.ts`, not this engine) gained
English forms in the same ticket: "I need emergency/urgent/immediate help",
"I am in danger", "I'm not safe", "connect me to emergency services".
