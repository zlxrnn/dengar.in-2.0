#!/usr/bin/env bash
# Start one web container per Care Passport fault scenario, run faults.mjs, clean up.
# Usage (repo root): bash scripts/testbench/faults.sh
set -euo pipefail
C="docker compose --env-file .env.testbench -f docker-compose.testbench.yml"
NAMES="tf-mock tf-ok tf-badkey tf-badmodel tf-429 tf-503 tf-hang"
cleanup() { docker rm -f $NAMES >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

$C run -d --name tf-mock bench scripts/testbench/faults.mjs mock >/dev/null
# Production timeout (AMD_TIMEOUT_MS default) everywhere except the hang scenario, kept short.
web() { local name=$1; shift; $C run -d --name "$name" "$@" web >/dev/null; }
web tf-ok
web tf-badkey -e AMD_API_KEY=invalid-key-testbench
web tf-badmodel -e AMD_MODEL=model-tidak-ada
web tf-429 -e AMD_BASE_URL=http://tf-mock:8080/s429/v1
web tf-503 -e AMD_BASE_URL=http://tf-mock:8080/s503/v1
web tf-hang -e AMD_BASE_URL=http://tf-mock:8080/hang/v1 -e AMD_TIMEOUT_MS=12000

for n in tf-ok tf-badkey tf-badmodel tf-429 tf-503 tf-hang; do
  until docker exec "$n" wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1; do sleep 2; done
done

$C run --rm -T bench scripts/testbench/faults.mjs

echo; echo "== Request yang diterima mock (hang/429/503)"
docker logs tf-mock 2>&1 | grep mock-request | sort | uniq -c || true

echo; echo "== Telemetri [CarePassport] (metadata saja)"
for n in tf-ok tf-badkey tf-badmodel tf-429 tf-503 tf-hang; do
  docker logs "$n" 2>&1 | grep '\[CarePassport\]' | sed "s/^/$n: /" || true
done
