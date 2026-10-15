# Local captured email

Mailpit captures SMTP locally; it does not deliver mail to a person's real inbox.
This P3.2 infrastructure is independent of PostgreSQL, passwords and account/authentication endpoints.
No relay or forwarding provider is configured. Version checks are disabled.

## Start, inspect and stop

Docker with Compose is required. From the repository root:

```sh
npm run mail:up
npm run mail:status
npm run mail:stop
```

These parent-owned package commands use `scripts/mail-compose.mjs` with only `compose.mail.yaml`
and the explicit project `foxmind-mail-local`: `up -d`, `ps`, and `stop` respectively.
The wrapper forces `COMPOSE_DISABLE_ENV_FILE=1` and removes inherited `COMPOSE_ENV_FILES`
from its child environment. No dotenv file is required or read; use the npm commands rather than
uncontrolled direct Compose invocations. Do not use the PostgreSQL Compose file to start mail,
remove its password requirement, or read/edit sensitive environment files to configure mail.

- Default inbox/API: <http://127.0.0.1:8025>; SMTP: `127.0.0.1:1025`.
  Optional shell variables `MAIL_SMTP_PORT` (default `1025`) and `MAIL_HTTP_PORT` (default `8025`)
  change only the loopback host ports; set them consistently for start/status/stop and the local sender.
- Public readiness: <http://127.0.0.1:8025/readyz>.
- Image: official `axllent/mailpit:v1.31.6`, pinned with its SHA-256 manifest digest in Compose and the test harness.
- Both published ports bind only to loopback. The local inbox has no authentication;
  other local processes/users can read captured messages. Do not expose it through tunnels/proxies.
- SMTP acceptance means local capture, not real delivery, account verification or successful recovery.
  Authentication/token issuance/consumption and the web journey are not implemented by this unit.

## Development retention

The `foxmind-mail-local` Compose project stores its inbox in the named `mailpit-data` volume
(normally `foxmind-mail-local_mailpit-data`), at `/data/mailpit.db` inside the container.
Stop/start preserves mail. The default development retention is explicitly 500 messages;
Mailpit automatically removes the oldest messages above that limit. This is a disposable local inbox,
not an archive, backup or durable application outbox. Avoid real secrets and personal/student data.
Do not run `down -v`, volume pruning, or inbox deletion commands as part of normal operation or testing.
Stopping is the normal rollback; leave the development volume intact.

## Isolated verification

```sh
npm run test:mail-capture
# Equivalent focused command:
node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs
```

The image must already be available locally and the Docker daemon must be running.
No PostgreSQL service, database password or external mail provider is needed. Tests resolve Compose
read-only with `COMPOSE_DISABLE_ENV_FILE=1` and inherited `COMPOSE_ENV_FILES` removed, checking
its single-service/loopback/persistence contract and default/custom host ports without dotenv access.
They send real SMTP with transient `.test` fixtures, query the public readiness/message API,
and stop/start the owned test container to prove captured text/HTML survives restart.
They never inspect SQLite internals or send messages through an HTTP shortcut.

`scripts/mailpit-test-runtime.mjs` exports `MAILPIT_IMAGE` and `withMailpit(callback)`.
Each call creates fresh UUID-named, ownership-labeled test container/storage and random loopback ports.
The callback receives a runtime object `{ smtpPort, httpOrigin, restart }`.
`restart()` stops/starts only that owned container and storage, resolves actual loopback bindings again,
updates the runtime object's endpoint properties and returns fresh `{ smtpPort, httpOrigin }` values.
Random host ports can change on stop/start: use the returned endpoints (or read the runtime properties
again), not previously destructured values. Development Compose ports are unaffected.
Readiness and Docker operations have bounded waits. `finally` verifies UUID ownership labels and exact
resource names before removing only those disposable resources, including on callback failure.
No development inbox, shared Compose project or database is used or purged. Cleanup errors are surfaced;
a forced process kill can still leave test resources, so never replace ownership checks with a global prune.

This proves local SMTP acceptance/capture and storage continuity only, not authentication, production
security, remote delivery, encrypted outbox durability or the complete verification/recovery user journey.
