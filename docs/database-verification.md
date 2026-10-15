# Database foundation verification

Corrected implementation candidate: `489cce14d2b44049108f14725ce5b1b6680f1c02`, against `0589aa2efef89c9010d6b0efcb639083dadb163f`. Initial implementation: `5910345729a3f06af2aa0a8d5cb6575f1af28f72`. Database verification is complete within the scope below. Independent revalidation passed. The user explicitly chose to close this candidate without native review after a pre-lineage integration failure; no native approval is claimed.

## Observed writer checks

| Check | Observed result |
|---|---|
| Docker engine | PASS, 29.7.2. |
| Prisma format and schema validation | PASS, Prisma7.10.0. |
| Client generation | PASS. |
| Empty-database RED (`npm run test:red`, job-5) | Expected exit1: missing schema/relation42P01. |
| First attempted GREEN (`npm test`, job-6) | Exit1: contract fixture overlapped duplicate-pair/FK checks; not a successful check. |
| Expanded check (job-7) | Exit1,34/35 contracts; JSON fixture was encoded as a PostgreSQL array. |
| Initial corrected suite (`npm test`, job-8) | Exit0,35/35 contracts, no skipped/cancelled tests. |
| Forward guard correction (`npm test`, job-9) | Exit0,38/38 contracts, including raw boundaries and both publication/reversion lock orders. |
| Compose config, JavaScript syntax, diff check | PASS, after forward correction. |
| Migration deployment and immediate replay | PASS; replay had no pending migrations. |
| Migration status and schema drift | PASS; up to date and no schema difference. |
| Generated Prisma runtime | PASS: create, typed relation, bigint and rollback against real PostgreSQL. |
| Diff whitespace check | PASS. |

The PostgreSQL test image is17.10-bookworm (pulled digest `sha256:9b18b78397054fce88a9552e9d5a3ad5bb7fd258c5b3cc1c5028e46373d6ea8f`). Every suite run uses a fresh random container with tmpfs state and an ephemeral loopback port, then removes that owned container. No persistent development database was started, reset or deleted.

## Independent verification

Initial verdict: **FAIL**,35 original contracts passed and two added probes failed (37 total, exit1), against archived commit5910345. The failing probes reproduced raw82-character names accepted after trimming and a submitted attempt reverted to draft while a published effective grade remained. S1/S5 failed; S2/S3 passed; S4 passed within verifier bounds. Runtime smoke was correctly skipped after the failed contract run. Evidence: `.test-artifacts/verify-qVk6w6/verifier-test.log`.

A single bounded correction was committed as489cce1 in a third forward migration; prior migrations were not modified. Parent checks passed38/38 and Prisma runtime smoke. The same verifier ran the targeted command `FOXMIND_TEST_NAME_PATTERN='raw text bounds|published grade (prevents|interlock)' npm test` exactly once in `.test-artifacts/recheck-6e0XsP`: exit0, three regression contracts PASS, deployment/replay/status/drift/generation PASS, Prisma runtime smoke PASS. Both blockers are CLOSED. S1/S5 now PASS; S2/S3 PASS and S4 bounded PASS carry forward without a new full sweep. Remote-history preservation was not independently audited. Evidence: `.test-artifacts/recheck-6e0XsP/verifier-recheck.log` lines24–73.

## Native review

Global RDD switch remains **on**. Initial ASSESS was unassessable because original product documents were untracked; the conservative independent-high-risk plan was followed. After independent PASS, INSPECT with explicit untracked exclusion returned ready. START for committed range0589aa2..489cce1 was blocked with `native-start-retained-selection-candidate-mismatch`, `mutation_performed:false`, `mutation_outcome:none`. No lineage was created. The offered next INSPECT required a workspace intended-untracked selection, so no repeated START, reset, recovery, switch change, capture or acknowledgement was attempted.

The user explicitly selected **“Cerrar este candidato sin revisión nativa”** for corrected candidate489cce1. This candidate is therefore closed without native review, not natively approved. The decision does not disable RDD, authorize another candidate to skip review, or authorize publication. Tests and independent verification stand separately.

## Scope of proof

These checks establish the schema, declared database constraints, migration replay and basic Prisma connectivity. They do not establish API authorization, password/security flows, actual file scanning, atomic academic workflows, rational calculation/display logic, job execution, notifications delivery or UI behavior. See [database operations and limitations](database.md).

## Local delivery chain

```text
main / origin/main at0589aa2
└── feat/database-foundation (tracker, no PR created)
    └── feat/database-schema:5910345 +489cce1
        └── feat/database-readiness:verification evidence and disposition
```

The tracker and child branches are local. No push, PR or merge was performed. Original product specification and visual references were preserved unchanged and remain untracked; they are not silently included in the implementation candidate.

The first slice is1,519 authored added lines (generated lockfile/base SQL excluded), larger than the advisory400-line review budget. The initial model's interdependent foreign keys are kept cohesive rather than compressed or split by file type. Feature-branch-chain was selected; no PR, push or merge was authorized. Review the custom SQL and its contract tests first, then the schema relations.
