# Run and verify the FoxMind database

The approved V1 model is implemented as a PostgreSQL schema and versioned Prisma migrations. This is a database foundation, not a running FoxMind application: API permissions, authentication flows, file scanning, academic workflows and UI are not implemented yet.

## Quick path

Requirements: Node.js 24, npm, and a running Docker Desktop Linux engine. Dependencies are pinned; use `npm ci --ignore-scripts` in a fresh clone.

Run the isolated contract suite:

```sh
npm test
```

The runner creates one uniquely named PostgreSQL container, generates a random password in memory, applies the migrations, runs SQL-interface tests and removes only that container. It ignores any incoming `DATABASE_URL`; no development database or persistent volume is used. It publishes PostgreSQL to a randomly assigned loopback-only port. Docker must already have, or be able to pull, `postgres:17.10-bookworm`.

To reproduce the initial missing-schema RED deliberately, use `npm run test:red`. This command is **expected to exit nonzero**; it does not validate the completed implementation.

## Persistent local development

Configuration uses terminal environment variables only. No `.env` files or templates are required or loaded. Choose a local password; do not commit credentials or paste them into tickets/logs. URL-encode special characters in the password component of the connection URL.

In PowerShell:

```powershell
$env:POSTGRES_PASSWORD = Read-Host 'Local PostgreSQL password' -MaskInput
$env:POSTGRES_PORT = '54329'
$env:DATABASE_URL = "postgresql://foxmind:$([uri]::EscapeDataString($env:POSTGRES_PASSWORD))@127.0.0.1:54329/foxmind"
npm run db:up
npm run db:migrate
npm run db:status
```

In Bash:

```sh
read -rs -p 'Local PostgreSQL password: ' POSTGRES_PASSWORD; echo
export POSTGRES_PASSWORD
export POSTGRES_PORT=54329
# Set DATABASE_URL using the same password, URL-encoded when necessary.
# Do not put a real password into a committed file or a shared shell transcript.
npm run db:up
npm run db:migrate
npm run db:status
```

Compose binds PostgreSQL only to `127.0.0.1`. Port 54329 is the default and can be changed using `POSTGRES_PORT`; update `DATABASE_URL` to match. `POSTGRES_PASSWORD` initializes a fresh volume; changing the variable does not change a password inside an existing database.

`npm run db:stop` stops the development container without deleting its volume. A Docker volume is **not a backup**. Never use `docker compose down -v` on data you want to preserve. This change does not start a development database automatically.

## Commands

| Command | Effect |
|---|---|
| `npm run db:validate` | Validate the Prisma schema without modifying a database. |
| `npm run db:generate` | Generate the ignored local Prisma client. |
| `npm run db:up` | Start the persistent local PostgreSQL service and wait for its healthcheck. |
| `npm run db:stop` | Stop that service without deleting its volume. |
| `npm run db:migrate` | Apply pending migrations to **DATABASE_URL**; inspect the target before running. |
| `npm run db:status` | Read migration status for DATABASE_URL. |
| `npm test` | Migrate and test a fresh isolated PostgreSQL container. |
| `npm run test:contract` | Run SQL contracts against DATABASE_URL; intended for an explicitly isolated test database only. |
| `npm run test:red` | Run against a fresh empty database; intentional failing baseline. |

For a bounded regression recheck only, set `FOXMIND_TEST_NAME_PATTERN` to a Node test-name regular expression before `npm test`, for example `raw text bounds|published grade`. This still uses a fresh container and runs migration/client checks, but filters contracts; unset it for the complete suite. The direct `test:contract` entry requires the runner's explicit isolated-database marker and is not the normal entry point.

Never run migration reset, db push or ad-hoc destructive SQL on a database containing work you need to retain.

## Schema map

`prisma/schema.prisma` is the physical field dictionary: it records field types, nullability, defaults, foreign-key relations and normal indexes. Every model maps to a snake_case PostgreSQL table. The second migration adds named SQL checks, partial unique indexes and narrow integrity triggers. A third forward-only migration corrects raw text-length checks and guards the reverse attempt-status transition for published grades. Existing invalid data makes validation fail; no text or history is silently rewritten.

| Area | Models | Integrity boundary |
|---|---|---|
| Identity | User, Session, AccountToken, AccountActionControl | Unique normalized email/token hash; finite token lifetime; counters and text bounds. |
| Classroom creation | ClassroomDraft, Classroom | Incomplete JSON wizard draft is separate from a published classroom; classroom owns a quota and one teacher. |
| Enrollment | ClassroomCode, Invitation, Enrollment, MembershipPeriod | Stable student/classroom identity, one open membership period, invitation classroom consistency and one live code. |
| Teaching plan | Unit, Topic, StudyPlanVersion | Unit/topic classroom consistency; at most one next topic; versioned plan files. |
| Files | FileObject, Upload, Material | Exactly one classroom/draft owner; separate upload/validation/scan states; private storage key, reservations and immutable reference identities. |
| Activities | Activity, ActivityInstructionFile, ActivityMaterial, Question, QuestionOption | Draft/publication metadata; matching classroom/unit/topic; explicit resource links; positive exact point input. |
| Participation | StudentActivity, Attempt, Answer, AnswerSelection, AttemptAttachment | One obligation per student/activity; attempt history; one open draft; question/option/attempt and file classroom boundaries. |
| Grading | AttemptGrade, QuestionGrade, GradeCorrection | One correction per attempt, exact rational question scores, published effective-grade reference and retained audit records. |
| Communication | WallPost, WallReply, Notification | Tombstones preserve replies; destinations remain in their classroom. |
| Deferred processing | BackgroundJob | Durable payload, deduplication key, lease token, attempts and retry-ready timestamp. |

No global account role is stored. User-facing roles come from classroom ownership and current membership.

### Precision without silent rounding

Final grades use **unbounded NUMERIC plus range/precision checks**, not `NUMERIC(4,2)`. PostgreSQL would round `8.345` to `8.35` before a check on a fixed-scale column; that would violate the approved rejection of manual inputs with more than two decimal places. Question point inputs follow the same rule.

QuestionGrade stores integer `earned_numerator` and positive integer `earned_denominator` in unbounded NUMERIC. This preserves exact fractions such as 4/3. The future grading service must perform rational arithmetic and final round-half-up, including `8.345 → 8.35`; **this migration does not implement that calculation or Spanish display formatting**.

Text limits count the stored input, including surrounding spaces; trimming is used only to reject blank required input. Published grades keep their attempts submitted. Publication takes a shared row lock on the attempt, and status changes check for published grades, serializing the two opposing transitions.

The `is_published`, `effective_grade_published` and `published_marker` fields support composite foreign keys to published records. SQL checks prevent caller-controlled marker values from bypassing that boundary. Publishing a grade on an unsubmitted attempt is rejected. A historical grade correction does not automatically change StudentActivity.effective_grade_id.

### Stable history

Enrollment survives departure. MembershipPeriod records actual entry/exit periods. StudentActivity records the student's obligation separately from attempts. Attempt stores submission receipt and the applied deadline/timeliness snapshot, so later deadline extensions need not rewrite history. Explicit foreign keys restrict destructive deletion of referenced academic records.

Published activity content is not copied into every attempt: the approved content-lock policy makes its identity stable. The future backend must enforce that lock transactionally.

## Rules reserved for the backend

These are required by the functional specification but **not provided by this schema or its tests**:

- Verified-email gates, password hashing/policy, sessions, single-use token consumption, resend cooldowns and abuse protection.
- Classroom authorization, archive read-only behavior, fixed timezone, owner identity and invitation acceptance/reentry rules.
- Publishing complete classroom/activity aggregates, option-count/correct-answer checks, and activity/resource locks from the first attempt.
- File size/type inspection, scanner integration, quarantine/download gates, atomic quota reservations and cleanup of only incomplete abandoned uploads.
- Submission permissions, five-file limit, individual/general deadline selection, DST ambiguity handling, reopening and editor-token enforcement. The schema supports compare-and-swap but does not supply a secure endpoint.
- Rational scoring, teacher-only private corrections/audits, atomic publication and effective-grade replacement, averages, notification dispatch and current-member metrics.
- Durable job execution, retries and lease ownership. The table alone does not execute work.

Database tests are not evidence of those future API behaviors. Unit tests, real database transaction tests and end-to-end authorization tests must accompany their implementation.

## Change and rollback boundaries

1. Generate/review schema changes, then create a new migration. Never rewrite an already deployed migration.
2. Keep the custom SQL migration: Prisma db push cannot recreate every check or trigger.
3. Test on a fresh isolated container with `npm test` before applying to local development.
4. For a fresh disposable database, removing the owned container removes test state. For a persistent database, rollback requires a reviewed forward migration and backup/restore plan; no automatic destructive rollback is included.

No cloud provider, production quota, deployment, S3 server, scanner or application framework was installed by this database slice.
