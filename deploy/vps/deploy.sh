#!/usr/bin/env bash
# Poll main, build before replacement, migrate, then health-check and roll back on failure.
set -Eeuo pipefail
ROOT=${DENGARIN_ROOT:-/opt/dengarin}
REPO=${DENGARIN_REPO:-https://github.com/zlxrnn/dengar.in-2.0.git}
BRANCH=${DENGARIN_BRANCH:-main}
mkdir -p "$ROOT"
exec 9>"$ROOT/deploy.lock"
flock -n 9 || exit 0
cd "$ROOT"
if [[ ! -d source/.git ]]; then
  git clone --depth 1 --branch "$BRANCH" "$REPO" source
fi
git -C source fetch --depth 1 origin "$BRANCH"
wanted=$(git -C source rev-parse FETCH_HEAD)
[[ $wanted =~ ^[a-f0-9]{40}$ ]] || exit 1
active=$(cat active-revision 2>/dev/null || true)
if [[ $wanted == "$active" ]] && [[ $(docker inspect --format '{{.State.Health.Status}}' dengarin-web 2>/dev/null || true) == healthy ]]; then
  printf 'Already healthy at %s\n' "$wanted"
  exit 0
fi
git -C source checkout --detach "$wanted"
printf 'Building %s\n' "$wanted"
# A verified prebuilt image can be loaded by an operator, or reused after a failed rollout.
if [[ $(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "dengarin-web:$wanted" 2>/dev/null || true) != "$wanted" ]]; then
  docker build --label "org.opencontainers.image.revision=$wanted" -f source/apps/web/Dockerfile -t "dengarin-web:$wanted" source
fi
previous=$(cat release.env 2>/dev/null || true)
# An interrupted first rollout can leave release.env without a healthy release.
[[ -n $active ]] || previous=''
printf 'DENGARIN_IMAGE=dengarin-web:%s\n' "$wanted" > release.next
chmod 600 release.next
mv release.next release.env
compose=(docker compose --env-file secrets.env --env-file release.env -f compose.yml)
rollback() {
  if [[ -n $previous ]]; then
    printf '%s\n' "$previous" > release.env
    "${compose[@]}" up -d --wait --wait-timeout 600 dengarin-web
    printf 'Restored previous application image\n' >&2
  fi
}
if ! "${compose[@]}" up -d --wait --wait-timeout 600 dengarin-postgres dengarin-redis; then rollback; exit 1; fi
if ! "${compose[@]}" run --rm --no-deps dengarin-web node --experimental-strip-types services/persistence/scripts/migrate.ts; then rollback; exit 1; fi
if ! "${compose[@]}" up -d --wait --wait-timeout 600 dengarin-web; then rollback; exit 1; fi
printf '%s\n' "$wanted" > active-revision.next
mv active-revision.next active-revision
printf 'Deployed healthy revision %s\n' "$wanted"
