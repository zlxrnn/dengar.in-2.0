// Exercise real git checkouts and updater rollback with an isolated fake Docker CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const script = fileURLToPath(new URL('../../deploy/vps/deploy.sh', import.meta.url));
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
// flock is a Linux utility; these integration cases run in a Linux container/host.
const hasFlock = run('flock', ['--version']).status === 0;
async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'dengarin-deploy-'));
  try {
    const repo = join(dir, 'origin'), root = join(dir, 'app'), bin = join(dir, 'bin');
    await mkdir(repo); await mkdir(root); await mkdir(bin);
    for (const args of [['init', '-b', 'main'], ['config', 'user.email', 'qa@example.invalid'], ['config', 'user.name', 'Synthetic QA']]) assert.equal(run('git', args, { cwd: repo }).status, 0);
    await writeFile(join(repo, 'source.txt'), 'synthetic');
    assert.equal(run('git', ['add', '.'], { cwd: repo }).status, 0);
    assert.equal(run('git', ['commit', '-m', 'fixture'], { cwd: repo }).status, 0);
    const sha = run('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();
    await writeFile(join(root, 'secrets.env'), 'POSTGRES_PASSWORD=synthetic\n');
    await writeFile(join(root, 'compose.yml'), 'services: {}\n');
    const docker = join(bin, 'docker');
    await writeFile(docker, `#!/bin/sh
printf '%s\\n' "$*" >> "$DENGARIN_ROOT/calls"
if [ "$1" = inspect ]; then printf 'healthy\\n'; exit 0; fi
if [ "$1" = image ] && [ "$2" = inspect ]; then printf '%s\\n' "$PREBUILT_SHA"; exit 0; fi
if [ "$1" = build ] && [ "$FAIL_STAGE" = build ]; then exit 31; fi
case "$*" in
  *' run '*) [ "$FAIL_STAGE" != migration ] || exit 32 ;;
  *' up '*dengarin-web*)
    if [ "$FAIL_STAGE" = health ] && grep -q "$WANTED_SHA" "$DENGARIN_ROOT/release.env"; then exit 33; fi ;;
esac
exit 0
`);
    await chmod(docker, 0o755);
    const env = { ...process.env, PATH: bin + ':' + process.env.PATH, DENGARIN_ROOT: root, DENGARIN_REPO: repo, WANTED_SHA: sha, FAIL_STAGE: '' };
    await fn({ root, sha, env, deploy: extra => run('bash', [script], { env: { ...env, ...extra } }) });
  } finally { await rm(dir, { recursive: true, force: true }); }
}
test('VPS updater deploys a new commit and skips a healthy unchanged revision', { skip: !hasFlock }, async () => fixture(async ({ root, sha, deploy }) => {
  assert.equal(deploy().status, 0);
  assert.equal((await readFile(join(root, 'active-revision'), 'utf8')).trim(), sha);
  const calls = await readFile(join(root, 'calls'), 'utf8');
  assert.ok(calls.indexOf(' run ') < calls.lastIndexOf(' up '));
  assert.equal(deploy().status, 0);
  const next = await readFile(join(root, 'calls'), 'utf8');
  assert.equal(next.split('\n').filter(l => l.startsWith('build ')).length, 1);
}));
for (const stage of ['build', 'migration', 'health']) {
  test(`VPS updater preserves the active revision after ${stage} failure`, { skip: !hasFlock }, async () => fixture(async ({ root, deploy }) => {
    await writeFile(join(root, 'release.env'), 'DENGARIN_IMAGE=dengarin-web:previous\n');
    await writeFile(join(root, 'active-revision'), 'previous\n');
    assert.notEqual(deploy({ FAIL_STAGE: stage }).status, 0);
    assert.equal((await readFile(join(root, 'release.env'), 'utf8')).trim(), 'DENGARIN_IMAGE=dengarin-web:previous');
    assert.equal((await readFile(join(root, 'active-revision'), 'utf8')).trim(), 'previous');
  }));
}

test('VPS updater accepts an image only when its revision label matches the requested commit', { skip: !hasFlock }, async () => fixture(async ({ root, sha, deploy }) => {
  assert.equal(deploy({ PREBUILT_SHA: sha }).status, 0);
  const calls = await readFile(join(root, 'calls'), 'utf8');
  assert.equal(calls.split('\n').some(l => l.startsWith('build ')), false);
  assert.equal((await readFile(join(root, 'active-revision'), 'utf8')).trim(), sha);
}));
