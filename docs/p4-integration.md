# P4 integration over accepted P3

This candidate connects the private-file infrastructure to the accepted account/session implementation. Local integration acceptance completed on2026-10-18: independent combined9/P3browser10/focused36, builds/migrations/drift/restart and cleanup0. See [attributed independent evidence](work-log/2026-10-18-p4-verify-final.md). P5 is not included. Historical failed attempts remain recorded; no native approval or production deployment is claimed.

## Local composition

See [host configuration](p4-host.md) for explicit `FILES_ENABLED=1`, private storage/scanner configuration and draft quota. Without that flag, existing P3 applications retain their account-only behavior. The host shares its real persisted identity, Origin/CSRF, admission and database transactions with file operations. Infrastructure and cleanup are owned by the application lifecycle.

[The web guide](p4-web.md) documents `/files` for an existing draft or classroom context. The server resolves authorization for that actual record; a URL context or client purpose never grants permission. Selecting a file does not confirm delivery. Only complete, validated and clean scanned bytes become ready. The view offers truthful pending/rejected/ready states, retry, quota, preview where allowed and a download fallback.

Creating classrooms/drafts, enrollment and publishing remain P5; linking Library/plan flows remains P6, and submission/editor/deadline policy remains P7. Unsupported attachment writes are denied. Test-only SQL domain fixtures do not implement those flows.

## Verification

```powershell
npm run test:p33:t2
npm run test:p4
npm run test:p4:integration
npm run test:p3:browser
```

The integration command builds API and production Next, creates disposable labelled PostgreSQL/S3/ClamAV/Mailpit resources, deploys all six migrations and checks drift. It registers/verifies/signs in through P3, selects and uploads a file through the real web view, checks immutable bytes and rejects unauthorized/unsafe states, then restarts actual database/storage resources and checks persisted retrieval. The fixture credentials stay in memory or ignored owned configuration; logs never contain connection secrets. Owned fixture resources are removed on exit; existing development volumes are preserved.

The legacy `test:p4 -- --persistent` command targets the isolated P4 development Compose project and its retained private configuration. Do not run it from a fresh checkout against those retained volumes. The combined integration runner proves persistence in its own random-label volumes instead.

Historical isolated68PASS and prior native receipts remain evidence for their exact P4 checkpoint, not proof or approval of this combined candidate. See [current tasks](../odd/tasks/p4-p3-integration.md) and [coordinator evidence](work-log/2026-10-17-root-p4-integration.md) for actual commands, failures and acceptance state.

The user authorized a90second outer budget only for the runner's policy/adapters/content/configuration group. The fresh API build still has its30second limit; scanner, parser, transfer and application operation budgets are unchanged.

Local integration merge: `d22c5224d755d1d4b9f0bf69dfa55b5a23626036` on `codex/p4-p3-integration`, with accepted P3 and isolated P4 as parents. This is not a push or a merge into the original dirty P3 checkout. Stop before P5 until separately authorized.
