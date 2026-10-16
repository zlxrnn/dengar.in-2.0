# SCRUM-41: production Redis warm-up uses obsolete cache keys

Reproduced on main f6b0270 with Next 15.5.28 and @fortedigital/nextjs-cache-handler 2.5.3.
`npm run test:redis -- --production` failed on the first `/resources` request:
expected HIT, received MISS. Development tests did not exercise this path.

The warm-up library seeds legacy pathname keys. Next now uses route-kind and
source-module owner hashes. The library also calls the primary RSC payload
`pageData`, whereas Next expects `rscData` bytes. Seeds existed but runtime could
not read them.

The adapter derives ownership from build manifests and uses Next's own key
function. It preserves owner hashes, build isolation and NX writes, restores the
primary RSC bytes, and skips unknown or ambiguous ownership rather than aliasing
routes. Startup still degrades gracefully if Redis or warm-up is unavailable.
The production diagnostic tests now authenticate every admin-only request,
including Redis-down and disabled cases; anonymous access still returns 404.

Regression coverage: five adapter tests and 21 production Redis checks pass,
including first-request HIT, shared cache/quotas across two instances, restart,
old-build isolation, anonymous denial, authenticated diagnostics, outage,
reconnection and no-Redis fallback. CI runs the adapter and production suite.

This validates the local production build, not a deployed server revision.
The adapter imports Next internals; dependency upgrades must pass this suite.
Release Owner review is required before merge.
