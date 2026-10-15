#!/usr/bin/env bash
# Local CA only for the private Docker PostgreSQL connection, separate from public HTTPS.
set -Eeuo pipefail
ROOT=${DENGARIN_ROOT:-/opt/dengarin}
cd "$ROOT"
install -d -m 750 tls
if [[ ! -f tls/server.key ]]; then
  umask 077
  openssl req -x509 -newkey rsa:3072 -nodes -sha256 -days 3650 -subj '/CN=Dengar.in internal database CA' -keyout tls/ca.key -out tls/ca.crt
  openssl req -newkey rsa:3072 -nodes -subj '/CN=dengarin-postgres' -keyout tls/server.key -out tls/server.csr
  printf 'subjectAltName=DNS:dengarin-postgres\nextendedKeyUsage=serverAuth\n' > tls/server.ext
  openssl x509 -req -in tls/server.csr -CA tls/ca.crt -CAkey tls/ca.key -CAcreateserial -out tls/server.crt -days 3650 -sha256 -extfile tls/server.ext
  # postgres:16-bookworm runs as uid/gid 999.
  chown 999:999 tls/server.key
  chmod 600 tls/server.key tls/ca.key
  chmod 644 tls/ca.crt tls/server.crt
fi
chmod 600 secrets.env
chmod 750 deploy.sh
