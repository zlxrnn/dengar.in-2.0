// Bug QA 14 Okt: cache ISR di Redis bersama selamat dari rebuild dan menyajikan
// HTML build lama yang menunjuk chunk JS/CSS 404. Key cache halaman WAJIB diberi
// namespace per build (BUILD_ID) supaya build baru tidak membaca key build lama.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKeyPrefix, resolveBuildId } from '../../apps/web/cache-handler.mjs';

const handlerPath = fileURLToPath(new URL('../../apps/web/cache-handler.mjs', import.meta.url));

describe('cache-handler: namespace key Redis per build', () => {
  it('menyertakan build id di prefiks dan tetap di bawah dengarin:next:', () => {
    assert.equal(buildKeyPrefix('abc123'), 'dengarin:next:abc123:');
  });

  it('dua build id berbeda menghasilkan prefiks berbeda', () => {
    const a = buildKeyPrefix('build-A');
    const b = buildKeyPrefix('build-B');
    assert.notEqual(a, b);
    assert.ok(a.startsWith('dengarin:next:') && b.startsWith('dengarin:next:'));
    // Key build lama tidak boleh menjadi awalan key build baru (SCAN pola lama tidak bocor).
    assert.ok(!a.startsWith(b) && !b.startsWith(a));
  });

  it('tanpa build id jatuh ke prefiks lama, bukan melempar', () => {
    for (const missing of [undefined, null, '', '   ', 42]) {
      assert.equal(buildKeyPrefix(missing), 'dengarin:next:');
    }
  });

  it('membersihkan karakter aneh dan whitespace (isi file BUILD_ID bisa berakhiran newline)', () => {
    assert.equal(buildKeyPrefix('abc\n'), 'dengarin:next:abc:');
    assert.equal(buildKeyPrefix('a b/c:d'), 'dengarin:next:a_b_c_d:');
    assert.equal(buildKeyPrefix('x'.repeat(100)).length, 'dengarin:next:'.length + 64 + 1);
  });

  it('resolveBuildId: konteks onCreation menang', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dengarin-buildid-'));
    const file = path.join(dir, 'BUILD_ID');
    await writeFile(file, 'from-file\n');
    assert.equal(resolveBuildId({ buildId: 'from-context\n' }, { buildIdFile: file, env: {} }), 'from-context');
  });

  it('resolveBuildId: membaca .next/BUILD_ID bila konteks kosong', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'dengarin-buildid-'));
    const file = path.join(dir, 'BUILD_ID');
    await writeFile(file, 'from-file\n');
    assert.equal(resolveBuildId({}, { buildIdFile: file, env: {} }), 'from-file');
    assert.equal(resolveBuildId(undefined, { buildIdFile: file, env: {} }), 'from-file');
  });

  it('resolveBuildId: file hilang -> deployment id platform -> undefined, tanpa melempar', () => {
    const missing = path.join(tmpdir(), 'dengarin-buildid-tidak-ada', 'BUILD_ID');
    assert.equal(resolveBuildId({}, { buildIdFile: missing, env: { VERCEL_DEPLOYMENT_ID: 'dpl_1' } }), 'dpl_1');
    assert.equal(resolveBuildId({}, { buildIdFile: missing, env: {} }), undefined);
    assert.equal(buildKeyPrefix(resolveBuildId({}, { buildIdFile: missing, env: {} })), 'dengarin:next:');
  });

  it('handler Redis memakai prefiks ber-build id, bukan literal lama', async () => {
    const source = await readFile(handlerPath, 'utf8');
    assert.match(source, /keyPrefix:\s*buildKeyPrefix\(buildId\)/);
    assert.match(source, /const buildId = resolveBuildId\(context\)/);
    assert.doesNotMatch(source, /keyPrefix:\s*['"]dengarin:next:['"]/);
  });
});
