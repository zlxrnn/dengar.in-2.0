# Dengar.in on a shared Docker VPS

Public URL: `https://dengar-in.vertalt.my.id`. The existing Caddy container
handles certificates and HTTPS. Only the web container joins its external
`vps_default` network; PostgreSQL and Redis have no published ports.

Server files live at `/opt/dengarin`. `source/` is a public, shallow checkout of
`https://github.com/zlxrnn/dengar.in-2.0.git`, branch `main`. Secrets and database
certificates live outside that checkout and are never copied into the image.

## First installation

Copy the Compose file, scripts, systemd units, and Caddy fragment to
`/opt/dengarin`. Create `secrets.env` using the example, with a random PostgreSQL
password and independent random application secrets. Use hexadecimal database
passwords so they work unchanged in the connection URL. Set actual provider
keys and model URLs only in that server-side file. Its permissions must be 600.

Run `bash /opt/dengarin/provision-tls.sh` once. It creates a private CA and a
certificate for `dengarin-postgres`; the web client verifies that certificate.
The key ownership targets uid 70 in `postgres:16-alpine`. Rerunning the script
repairs key ownership without replacing existing certificates.

Append the Caddy fragment to the existing configuration, validate it, and reload
Caddy before starting the application deployment. This allows certificate issuance
to finish independently of image downloads; the proxy returns 502 until the app is ready.
Install the units into `/etc/systemd/system`, run `systemctl daemon-reload`, then
`systemctl start dengarin-update.service`.
Enable polling with `systemctl enable --now dengarin-update.timer`.

## Automatic updates

The timer checks GitHub approximately every minute after the previous attempt
finishes. No GitHub token, webhook, or exposed deployment endpoint is required
for this public repository. A file lock prevents overlapping deployments.

A new revision is built before replacing the running application. A preloaded
image is reused only when its OCI revision label matches that exact commit. Database
migrations run before the new web container starts. The updater only records
`active-revision` after Compose reports healthy. Build failures leave the old
app untouched. Migration/startup failures restore the previous image when one
exists. Database schema changes are **not** reversed by application rollback.
The first deployment has no previous image to restore.

PostgreSQL data persists in Docker volume `dengarin_postgres_data`; application
redeploys do not delete it. Redis holds disposable cache/rate-limit state.
Docker logs rotate at 10 MB with three files per container. Do not use
`docker compose down -v` on this production stack.

Deployment scripts and proxy settings under `/opt/dengarin` are operator-managed;
GitHub polling updates application source/images, not those host control files.
Changes to these deployment templates must be applied separately.

## Operations

```bash
systemctl status dengarin-update.timer
journalctl -u dengarin-update.service -n 80 --no-pager
cat /opt/dengarin/active-revision
systemctl start dengarin-update.service
systemctl stop dengarin-update.timer
```

To manage containers, use `/opt/dengarin` as the working directory:

```bash
docker compose --env-file secrets.env --env-file release.env -f compose.yml ps
```

Keep copies of the PostgreSQL volume, database credentials and CA private key
in your normal VPS backup system. The templates do not configure off-site backups.
