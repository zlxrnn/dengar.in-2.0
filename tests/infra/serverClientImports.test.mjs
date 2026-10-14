// BUG-20261014-01: a Server Component must not import non-component values
// (strings, constants, helpers) from a 'use client' module. Next.js turns every
// export of such a module into a Client Reference proxy, so e.g. an inline
// <script> string becomes `function(){throw Error("Attempted to call ...")}`.
// Static check over apps/web/src/app: named imports from client files must be
// PascalCase component names (or type-only imports).
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/web/src');
const appDir = join(src, 'app');

const isClientModule = (file) => /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8'));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function resolveImport(from, specifier) {
  const base = specifier.startsWith('@/')
    ? join(src, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const suffix of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Yields { from, specifier, names } for every value import in a server file. */
function* clientImportsFromServerFiles() {
  const importPattern = /import\s+(type\s+)?(?:\w+\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;
  for (const file of walk(appDir)) {
    const text = readFileSync(file, 'utf8');
    if (isClientModule(file)) continue;
    for (const match of text.matchAll(importPattern)) {
      const [, typeOnly, braces, specifier] = match;
      if (typeOnly) continue;
      const target = resolveImport(file, specifier);
      if (!target || !isClientModule(target)) continue;
      const names = (braces ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('type '))
        .map((s) => s.split(/\s+as\s+/)[0]);
      yield { from: file.slice(src.length + 1), specifier, names };
    }
  }
}

const looksLikeComponent = (name) => /^[A-Z][a-z][A-Za-z0-9]*$/.test(name);

it('server files under app/ only import components from use-client modules', () => {
  const offenders = [];
  for (const { from, specifier, names } of clientImportsFromServerFiles()) {
    for (const name of names) {
      if (!looksLikeComponent(name)) offenders.push(`${from}: { ${name} } from '${specifier}'`);
    }
  }
  assert.deepEqual(offenders, [], `non-component imports from 'use client' modules:\n${offenders.join('\n')}`);
});

it('layout.tsx reads ACCESSIBILITY_INIT_SCRIPT from a module without use client', () => {
  const layout = readFileSync(join(appDir, 'layout.tsx'), 'utf8');
  const match = layout.match(/import\s*\{[^}]*\bACCESSIBILITY_INIT_SCRIPT\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/);
  assert.ok(match, 'layout.tsx must import ACCESSIBILITY_INIT_SCRIPT');
  const target = resolveImport(join(appDir, 'layout.tsx'), match[1]);
  assert.ok(target, `cannot resolve ${match[1]}`);
  assert.equal(isClientModule(target), false, `${match[1]} must not start with 'use client'`);
});

it('AccessibilityMenu shares the storage key with the init script (single source)', () => {
  const menu = readFileSync(join(src, 'components/ui/AccessibilityMenu.tsx'), 'utf8');
  const script = readFileSync(join(src, 'components/ui/accessibilityInitScript.ts'), 'utf8');
  assert.match(menu, /import\s*\{[^}]*\bACCESSIBILITY_STORAGE_KEY\b[^}]*\}\s*from\s*['"]\.\/accessibilityInitScript['"]/);
  assert.doesNotMatch(menu, /export const ACCESSIBILITY_(STORAGE_KEY|INIT_SCRIPT)\b/);
  assert.match(script, /export const ACCESSIBILITY_STORAGE_KEY = 'dengarin:aksesibilitas'/);
  assert.match(script, /export const ACCESSIBILITY_INIT_SCRIPT = `\(function\(\)\{try\{/);
});
