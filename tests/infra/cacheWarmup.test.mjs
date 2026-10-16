import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRouteCacheKey } from 'next/dist/server/lib/route-cache-key.js';
import { createWarmupCacheHandler } from '../../apps/web/cache-warmup.mjs';

const writes = [];
class Handler {
  async set(...args) { writes.push(args); }
}
const options = {
  appPaths: { '/page': 'app/page.js', '/resources/page': 'app/resources/page.js', '/(help)/guide/page': 'app/(help)/guide/page.js', '/icon.svg/route': 'app/icon.svg/route.js' },
  pages: {},
  prerenderManifest: { routes: { '/': { dataRoute: '/index.rsc', srcRoute: '/' }, '/resources': { dataRoute: '/resources.rsc', srcRoute: '/resources' }, '/guide': { dataRoute: '/guide.rsc', srcRoute: '/guide' }, '/icon.svg': { dataRoute: null, srcRoute: '/icon.svg' } } },
};
const Page = { kind: 'APP_PAGE', html: '<p>synthetic</p>', pageData: 'main-rsc', rscData: Buffer.from('prefetch-rsc') };

test('warm-up uses Next route owner identity and the primary RSC payload', async () => {
  writes.length = 0;
  const Warmup = createWarmupCacheHandler(Handler, options);
  const context = { revalidate: false, setOnlyIfNotExists: true };
  await new Warmup().set('/resources', Page, context);
  assert.equal(writes[0][0], getRouteCacheKey('/resources', { kind: 'APP_PAGE', sourceRoute: '/resources/page' }));
  assert.equal(writes[0][1].rscData.toString(), 'main-rsc');
  assert.equal('pageData' in writes[0][1], false);
  assert.equal(writes[0][2], context);
});

test('root and grouped modules retain their distinct source-route identity', async () => {
  writes.length = 0;
  const Warmup = createWarmupCacheHandler(Handler, options);
  const handler = new Warmup();
  await handler.set('/index', Page, {});
  await handler.set('/guide', Page, {});
  assert.equal(writes[0][0], getRouteCacheKey('/', { kind: 'APP_PAGE', sourceRoute: '/page' }));
  assert.equal(writes[1][0], getRouteCacheKey('/guide', { kind: 'APP_PAGE', sourceRoute: '/(help)/guide/page' }));
});

test('route handlers use their own owner namespace and retain body bytes', async () => {
  writes.length = 0;
  const Warmup = createWarmupCacheHandler(Handler, options);
  const value = { kind: 'APP_ROUTE', body: Buffer.from('svg'), status: 200 };
  await new Warmup().set('/icon.svg', value, {});
  assert.equal(writes[0][0], getRouteCacheKey('/icon.svg', { kind: 'APP_ROUTE', sourceRoute: '/icon.svg/route' }));
  assert.equal(writes[0][1], value);
});

test('unknown, ambiguous or incomplete page entries are not seeded under an unsafe alias', async () => {
  writes.length = 0;
  const ambiguous = { ...options, appPaths: { ...options.appPaths, '/(other)/resources/page': 'other.js' } };
  const Warmup = createWarmupCacheHandler(Handler, ambiguous);
  await new Warmup().set('/resources', Page, {});
  await new Warmup().set('/missing', Page, {});
  const Normal = createWarmupCacheHandler(Handler, options);
  await new Normal().set('/resources', { ...Page, pageData: undefined }, {});
  assert.equal(writes.length, 0);
});

test('fetch entries are not rewritten as route entries', async () => {
  writes.length = 0;
  const Warmup = createWarmupCacheHandler(Handler, options);
  const value = { kind: 'FETCH', data: { body: 'synthetic' } };
  await new Warmup().set('fetch-hash', value, {});
  assert.equal(writes[0][0], 'fetch-hash');
  assert.equal(writes[0][1], value);
});
