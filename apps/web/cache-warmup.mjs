import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routeCache from 'next/dist/server/lib/route-cache-key.js';
import appPathUtils from 'next/dist/shared/lib/router/utils/app-paths.js';

/** Bridge the warm-up library's legacy pathname/RSC format to current Next keys.
 * Never strip Next's owner hash: it separates groups, slots and route kinds.
 */
export function createWarmupCacheHandler(CacheHandler, { appPaths, pages, prerenderManifest }) {
  return class RouteAwareWarmupHandler extends CacheHandler {
    async set(key, value, context) {
      if (!['APP_PAGE', 'APP_ROUTE', 'PAGES'].includes(value?.kind)) {
        return super.set(key, value, context);
      }
      const routes = prerenderManifest.routes;
      // registerInitialCache renames the root to /index for filesystem lookup.
      // If an actual /index route coexists, skip ambiguous warm-up safely.
      if (key === '/index' && routes['/'] && routes['/index']) return;
      const pathname = key === '/index' && routes['/'] ? '/' : key;
      const entry = routes[pathname];
      if (!entry) return;
      const source = entry.srcRoute ?? pathname;
      let owner;
      if (value.kind === 'PAGES') {
        if (!pages[source]) return;
        owner = { kind: 'PAGES', sourceRoute: source };
      } else {
        const suffix = value.kind === 'APP_PAGE' ? '/page' : '/route';
        const matches = Object.keys(appPaths).filter((module) => module.endsWith(suffix)
          && appPathUtils.normalizeAppPath(module).replace(/%5F/g, '_') === source);
        // Ambiguous ownership is a cache-poisoning risk; let the first request render.
        if (matches.length !== 1) return;
        owner = { kind: value.kind, sourceRoute: matches[0] };
      }
      if (!routeCache.isRouteCacheOwner(pathname, owner, entry)) return;
      const storageKey = routeCache.getRouteCacheKey(pathname, owner);
      if (value.kind === 'APP_PAGE') {
        // The library labels the main .rsc payload pageData and the optional
        // prefetch payload rscData. Next's APP_PAGE expects the main bytes here.
        if (typeof value.pageData !== 'string') return;
        const { pageData, ...page } = value;
        return super.set(storageKey, { ...page, rscData: Buffer.from(pageData, 'utf8') }, context);
      }
      return super.set(storageKey, value, context);
    }
  };
}

export async function registerRouteAwareInitialCache(CacheHandler, registerInitialCache, appDir) {
  const buildDir = path.join(appDir instanceof URL ? fileURLToPath(appDir) : appDir, '.next');
  const json = async (file) => JSON.parse(await readFile(path.join(buildDir, file), 'utf8'));
  const [appPaths, pages, prerenderManifest] = await Promise.all([
    json('server/app-paths-manifest.json'), json('server/pages-manifest.json'), json('prerender-manifest.json'),
  ]);
  const Handler = createWarmupCacheHandler(CacheHandler, { appPaths, pages, prerenderManifest });
  await registerInitialCache(Handler, {
    buildDir: path.relative(process.cwd(), buildDir),
    setOnlyIfNotExists: true,
  });
}
