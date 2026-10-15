# Backend foundation verification

Historical evidence for candidate766f342 follows. Its inherited audit warnings were subsequently addressed by the [dependency security remediation](dependency-security.md); the audit entries below are retained as historical results, not the current dependency status.

Candidate: `766f342cdd6e2e1caa7a39ebced41615c03a06ac`, against `72342a1715e38286e7f0a591ef455788e9a0f7fb`. Verification is complete within the minimal foundation scope. Independent verification passed; the user explicitly closed this candidate without native review after a pre-lineage integration failure. This is not native approval or a clean dependency audit.

## Observed writer checks

| Check | Observed result |
|---|---|
| Dependency installation | PASS, NestJS12.1.3/TypeScript5.9.3 pinned; Prisma7.10 unchanged. |
| HTTP/config RED (job14) | Expected exit1 after successful build/migrations: five behavior contracts failed against empty Nest routes; two baseline contracts passed. |
| First GREEN (job15) | Exit0,7/7 API contracts PASS. |
| Final public build and suites (job16) | Exit0: api:build PASS,7/7 API contracts including real pool shutdown PASS,38/38 existing database contracts PASS. |
| Database deploy/replay/status/drift and Prisma runtime smoke | PASS, unchanged database runner/schema/migrations. |
| Staged diff whitespace | PASS. |
| Dependency audit (job13) | **Exit1**, four high-severity entries via Prisma CLI/config and its affected transitive versions. Not remediated and not a clean audit. |

The API contracts use a real loopback HTTP listener and a disposable PostgreSQL container. They cover fixed response bodies/headers, healthy readiness, DB pause503 with surviving liveness, recovery, sanitized exact configuration errors/exit1, compiled CLI startup, absent product endpoints, listener closure and real named database-connection closure. No persistent development database or volume was created, reset or removed.

Affected audit versions already exist in baseline72342a1's lockfile: Prisma/config7.10.0, deepmerge-ts7.1.5, mysql2 3.15.3. No Nest package appears in the advisory graph. This identifies inherited package presence; it does not prove that all possible uses are safe or that remediation is unnecessary. No audit force-fix or major downgrade was performed.

## Independent verification

**PASS within the minimal foundation scope; no candidate-caused blockers.** The verifier ran api:build, test:api and npm test exactly once from `.test-artifacts/backend-verify-0ZbQ2u`, each exit0. Build/generation PASS, API7/7 PASS, database38/38 plus migration checks and Prisma smoke PASS. Evidence: `verifier-build.log`, `verifier-api.log`, `verifier-database.log`, `verifier-exits.log` in that scratch directory.

S1/S2/S4 PASS. S3 PASS within tracked scope: parent observed exact candidate/base name-status and preservation diff exit0, proving schema/migrations/Compose/old database commands/tests/docs unchanged. Original untracked documents/images lack historical hashes; their historical byte equality is not independently proven.

The inherited audit remains unresolved. The verifier found no new route accepting untrusted merge graphs or MySQL input in these fixed PostgreSQL health handlers; advisory package presence was not a candidate blocker, and exhaustive dependency safety was not claimed. Framework close released listener and real database connections; Windows signal-driven graceful shutdown remains unproven. No retries, edits, installs or correction batch were performed.

## Native review

Global RDD remains **on**. ASSESS for72342a1..766f342 was unassessable because original product documents are untracked; the conservative high-risk independent plan was followed. After independent PASS, the parent repeated the reported api:build command and diff check successfully. INSPECT excluding untracked paths returned ready. START for the committed candidate was blocked with `native-start-retained-selection-candidate-mismatch`, `mutation_performed:false`, `mutation_outcome:none`, before any lineage was created.

The user explicitly selected **“Cerrar este backend sin revisión nativa”** for766f342. This candidate is therefore closed without native review, not approved by native review. No capture, acknowledgement, reset, recovery, switch change or publication was performed. The omission applies only to this backend candidate; it neither fixes the inherited dependency alerts nor grants permission to skip future reviews.

## Scope and local delivery

```text
feat/database-readiness at72342a1
└── feat/backend-foundation (local tracker)
    └── feat/backend-server:766f342
        └── feat/backend-readiness (verification evidence and candidate disposition)
```

The server unit contains440authored changed lines excluding generated lockfile output, slightly above the advisory400-line review budget. It remains one cohesive server/configuration/Prisma/runtime-test unit; no compression or tests were omitted. No PR, push or merge was performed.

This is a local backend foundation only. No authentication, classroom API, file service, frontend, production hardening or deployment is delivered. Readiness proves SELECT1 connectivity, not schema completeness or domain correctness. Signal behavior under forced termination is not a graceful-shutdown guarantee. See [backend operations and limits](backend.md).
