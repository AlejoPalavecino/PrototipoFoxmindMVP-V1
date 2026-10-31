# FoxMind local operation and synthetic pilot preparation

**Local development only.** Accepted P3–P8 provide accounts, private files, classrooms/enrollment, Plan/Library/Muro, activities/attempts and private/published grading/progress. P9 adds Inicio and joined local evidence; its final independent local acceptance is complete; publication is tracked separately in the [roadmap](../../implementation-roadmap.md) and [170-row matrix](../../p9-acceptance-matrix.md). This is not production readiness, permission to deploy, or an invitation to use real participants/data.

## Choose an owned local environment first

The product is a Next.js browser application with a loopback Nest API and PostgreSQL, private S3-compatible storage, ClamAV and local Mailpit. The browser calls Next's `/api/v1` proxies; Nest owns identity, authorization, academic transactions and private bytes. UI IDs and a role selector never grant authority. Classroom/file features require explicit backend configuration; an account-only startup is not a complete classroom environment.

Use Node24 and the root lock-matching dependencies, Docker Desktop's Linux engine, matching Playwright browser for browser checks, and Python standard library for the binary-fixture decoder. Do not install/upgrade dependencies as an incidental verification repair. A fresh developer installation is a separate operator-approved setup action using the lockfile; do not copy a previous API/Next/generated build and call it fresh.

- **Disposable verification:** existing test helpers create random exact-owner PostgreSQL/storage/scanner/Mailpit resources and synthetic accounts. They apply migrations only to their own empty database. They configure API+Next with ephemeral loopback ports and own cleanup. Follow the finite [verification plan](../../p9-verification-plan.md), not all historical one-shot commands in old records.
- **Manual local development:** the operator must first identify and authorize the exact database, private bucket, scanner, captured-mail instance and credentials to use. No helper discovery of retained credentials is allowed. Existing retained `p4-local`, the original dirty P3 checkout and development volumes are NOT disposable test resources. Do not run `npm run p4:local` or the legacy persistent P4 test against them as a shortcut.

## Configuration ownership

Supply configuration through the approved process environment; the application does not load environment files. Never put secret values, passwords, credential-bearing URLs, proof tokens or real student information in source, Markdown, terminal examples, screenshots or logs. These links define exact current validation, not permission to read secret files.

| Owner | Required configuration and responsibility |
|---|---|
| Database operator | `DATABASE_URL`, optional `API_PORT`; separately provision and migrate the exact authorized database. [Database](database.md). Starting the API does not migrate/reset data. |
| Identity operator | Exact `APP_ORIGIN`, independent `AUTH_CSRF_HMAC_KEY` and `AUTH_ABUSE_HMAC_KEY`, `AUTH_OUTBOX_KEYS_JSON`/`AUTH_OUTBOX_ACTIVE_KEY_ID`; local HTTP only under the documented nonproduction loopback rule. Keep durable keys stable over restart and retain required old outbox keys. [Identity startup](../identity/http.md#startup-without-environment-files). |
| Captured-mail operator | Existing loopback `MAIL_SMTP_PORT` and trusted frontend origin. Mailpit accepts local synthetic messages, never real external delivery. [Local email](local-email.md). Preserve the development inbox volume; an unauthenticated loopback inbox must not be exposed. |
| Private-file operator | Exact `FILES_ENABLED=1`, complete `FILES_S3_*`, `FILES_SCANNER_HOST`/`FILES_SCANNER_PORT`, explicit `FILES_DRAFT_QUOTA_BYTES`. Provision the private bucket separately; application startup creates neither credentials nor bucket. [File host](../files/host.md). |
| Classroom operator | Exact `CLASSROOMS_ENABLED=1`, explicit `CLASSROOMS_QUOTA_BYTES`, distinct durable `CLASSROOMS_SIGNING_KEY`/`CLASSROOMS_DELIVERY_KEY`; requires private files and shares identity's exact origin. No production quota default. [Classroom host](../classrooms/host.md). |
| Web operator | Server-only `FOXMIND_API_ORIGIN` equals the actual API's bare loopback origin. The browser origin equals identity `APP_ORIGIN` and trusted mail frontend origin; `localhost` and `127.0.0.1` are different origins. Never expose the upstream/keys through public environment variables. [Account web](../identity/web.md), [classroom web](../classrooms/web.md). |

The manual startup sequence below is documentation, **not executed by this task**. Use only after the operator has provisioned the named environment. Migration is deliberately separate; this guide does not authorize applying it to retained data.

```powershell
# From the repository root, after explicit environment provisioning/migration.
node scripts/build-api.mjs
node node_modules/next/dist/bin/next build apps/web
# API terminal, with the approved environment already supplied:
npm run api:start
# Separate web terminal, with server-only FOXMIND_API_ORIGIN already supplied:
npm run web:start
```

Existing build policies remain API30s and Next180s in their bounded runners; use those supervisors for acceptance, not an unbounded shell wait. The API binds127.0.0.1; default API3001 and package web3000 must be distinct. For interactive development `npm run web:dev` uses the same origin/configuration rules but is not a production-build acceptance substitute. `/api/v1/health/live` proves process response; `/api/v1/health/ready` proves a database query, not migrations/academic readiness or completed product flows.

## Product quick path

1. Open the exact configured browser origin. Register/sign in with a synthetic account; use locally captured verification email and explicit confirmation. Ordinary login for a verified account goes to `/inicio`; explicit permitted destinations and invitation flows retain their own routing. Verification remains required.
2. A teacher creates a private draft, uploads a real allowed plan and completes required classroom/unit/topic data before publication. File selection is not upload; uploaded bytes are not usable until validated, scanned CLEAN and ready.
3. A second synthetic account joins by explicit code confirmation or accepts its own captured invitation. Opening a link, signing in or receiving queued mail does not enroll anyone. A teacher account creates classrooms; a separate student account joins them. The account role is selected at registration and cannot be switched.
4. Exercise Plan/Library/Muro and one actual activity/submission/grade publication. Drafts and private corrections remain private; selecting/uploading attachments is not a confirmed submission, and an unpublished grade is not a final student result.
5. Observe confirmed autosave/receipt/publication and authorized downloads. Do not equate a screenshot, health check or policy-only test with browser→API→SQL→private-storage/captured-email acceptance. Record exact source/proof identities and owned cleanup.

## Truthful failures and recovery

Read [service/mail recovery evidence](../../p9-failure-recovery.md) before running an outage. A database outage must retain dirty text and require an explicit successful retry, not show falsely saved work. An unavailable storage/scanner keeps a file nonready; restoring a service is not an automatic approval or quota refund. Existing scanner25s/client30s, parser/storage/proxy/ingress limits, freshness, session and quota policies stay unchanged. A stored ZIP containing a valid educational WAV asset does not add direct audio upload to the allowlist.

SMTP queued200 is not delivery: a real failed attempt and the unchanged natural60s retry must precede intended-recipient local capture. Use public classroom navigation to refresh normal invitation state; `Actualizar aula` belongs only to root load/action errors. Do not force dispatch, rewrite SQL jobs, change clocks or increase budgets to manufacture success.

Only exact-owner fixture controls may pause/resume resources. Fresh admission checks live loopback bindings; an already admitted paused target may retain its unchanged configured endpoint if Docker omits transient live mappings. Finally restores admitted targets before destroying their exact owned resources, even on callback failure. No global prune, shared Compose restart, tunnel, foreign-resource cleanup or retained-volume removal. External scratch is retained until the coordinator explicitly resolves cleanup ownership.

## Synthetic pilot checklist — preparation only

- [ ] Record accepted candidate SHA and per-row evidence; final independent Sol/xhigh is complete before any conditional main publication. Keep unavailable/baseline advisories explicit.
- [ ] Name the operator and exact disposable resource boundary, loopback origins/ports, private storage quota, key lifecycle and cleanup owner without logging credentials.
- [ ] Use only synthetic teachers/students, fictitious classroom content and locally captured recipients. No real student records, real invitations, production email provider or external participants.
- [ ] Verify browser identity/permissions and current-membership boundaries, actual private bytes, confirmed persistence and visible recovery; keep academic completion, performance and taught-plan progress separate.
- [ ] Forecast scan/transport/disk costs before large-file work. Five50M files require250M **plus existing usage**; owned300M proof never changes shared100M fixture default or operator production quota policy.
- [ ] Record failure/retry/rollback contacts and exact owned cleanup results. A command failing or required proof staying unavailable stops the affected work; do not silently lower scope or extend timeouts.
- [ ] Keep deployment, remote infrastructure, real pilot recruitment and retained-data operations unperformed. Main merge/push, when all acceptance passes, is repository publication only—not deployment or pilot launch.

## Evidence and next action

[Home proof](../home/home.md), [joined journeys](../../p9-joined-journeys.md), [owned controls](../testing/owned-runtime-controls.md), [five50M report](../../work-log/2026-10-20-p9-binary-capacity-worker.md), [matrix](../../p9-acceptance-matrix.md) and [finite independent plan](../../p9-verification-plan.md) distinguish inherited acceptance, own proof and pending independent closure. L67 SMTP own proof now passed after Docker restoration; prior L65 setup failure stays attributed. Final independent Verify is now complete; main publication is tracked separately, and this guide claims no deployment or native approval.


## Accepted local checkpoint

[Final independent Sol/xhigh report](../../work-log/2026-10-20-p9-final-independent-verify.md) and [exact ledger](../../p9-final-row-ledger.json) supersede earlier pending-verification notes. Full local P9 is verified; this guide remains synthetic/local only. Hosting, numerical productionquota and deployment decisions are explicitly deferred, not silently chosen. No new participant or retained-data operation is authorized.
