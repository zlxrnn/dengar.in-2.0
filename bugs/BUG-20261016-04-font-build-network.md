# SCRUM-24: external font fetches delay VPS compilation

The automatic VPS build logged socket hang up and repeated 1/3 retries during
Next compilation. The root layout's only font import was next/font/google;
its downloader fetches Google CSS/font resources and uses the matching retry
handler. Compilation eventually continued after over eleven minutes, while
the first full rollout had already exceeded its 30-minute outer budget.

Bundle the same Schibsted Grotesk variable font with next/font/local, preserving
600–800 heading weights, swap display, the CSS variable, glyphs and OFL license.
FontTools only repackages the pinned upstream TTF as WOFF2. Keep source/output
hashes and a public license copy. Do not substitute a different typeface.

Recurrence rule: app compilation must succeed with RUN-step networking disabled
once dependencies are supplied; heading-font loading must use same-origin
assets. Validate this with an actual offline compilation and mobile browser
smoke rather than a test that only matches the import string. First-party bug
records are used because this repository has no SPEC.md.
