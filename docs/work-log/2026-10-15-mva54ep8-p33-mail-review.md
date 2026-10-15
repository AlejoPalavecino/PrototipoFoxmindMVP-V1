# P3.3 T1 — Independent UNIT A mailbox PASS

- Verifier task: `mva54ep8-j-v2bc`; separate session ID unavailable.
- Persisted by: coordinator `01a13fc3-5dac-75fc-a82f-71fe21722f18`, from the settled read-only report.
- Date: 2026-10-15; provenance parent-supplied, not independently Git-verified.
- Branch/candidate/base: `feat/p33-mail-compatibility` / `ab0d39769af6204bf1669d9da70163ecfb733831` / `1a1ee46fc8d8ba7e7dc7c4016e071bf484c1cd6d`.
- Status: `completed` within assigned mailbox-foundation scope, not T1/P3.3 completion.

## Request and scope

User verbatim: "Vamos con el siguiente". Read-only independent A verification; current full feature checklist overlay separately declared. Source archive excludes.env/.env.example. No source/Git/dependency/native/publishing actions, retries or additional probes.

## Work performed

Inspected complete feature/Log, AGENTS, roadmap/protocol, relevant functional specification, contracts, sender guide/writer record, mailbox/service/index/configuration/module/templates, private tsconfig, tests and SMTP/Mailpit helpers.

## Verification

CWD `.test-artifacts/p33-verify-mail-Y1BTtk`. Each exact command once, foreground,30second limit:

```sh
node ../../node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json > verifier-mail-build.log 2>&1
node --test --test-concurrency=1 tests/p33-mailbox.test.mjs tests/p33-mailbox-flow.test.mjs tests/p31-contracts.test.mjs > verifier-mail.log 2>&1
```

Both exit0. Compile log empty; tests19PASS/0FAIL/0skips/cancelled/todo,2560.4882ms. Logs contain no raw recipient/token/link material. No retries/extra commands.

S1 PASS foundation only. S2 PASS mail/schema seam(idn-email, Unicode domain case/shared profile email); HTTP deferred. S3 PASS actual fresh Mailpit for quoted-space/Unicode-local/IDNA-domain/trimmedASCII with exact local spelling and equivalent domain wire representation. S4 PASS sender input rejection before SMTP, fixed local transport/fragments/sanitized errors; security B deferred. S5/S6 DEFERRED C/persistence/HTTP. S7 PASS assigned isolation/evidence, branch provenance supplied by parent.

Supporting source: mailbox.ts:5–26; account-mail.service.ts:57–82; OpenAPI:1525–1529,1670–1672; tests/p33-mailbox-flow.test.mjs.

## Commits and outcomes

No blocker observed. Verifier made no source edit/commit; coordinator persists this report. No independent full baseline/audit/native review or repository-wide mutation sweep.

## Handoff and limits

Reconcile B/C and B's due native review. Future HTTP must call validateMailbox before lookup/persistence/issuance, map invalid input422 and preserve returned spelling. Local capture is not human delivery/exhaustiveRFC/account/persistence proof. No unexpected mutation observed; no separate filesystem sweep authorized.
