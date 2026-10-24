# Agenda academic projection — implementation

- Agent / role: agenda_academic / slice_worker
- Session or task ID: /root/agenda_academic
- Date: 2026-10-23
- Branch / worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind
- Starting commit: ed06f88
- Phase and detailed task/spec links: [Agenda A2](../../odd/tasks/agenda.md), functional specification sections 2 and 8
- Status: completed

## Request and scope
Implement the academic Agenda read port and safe target resolution. Own only classrooms/agenda*.ts, classrooms/index.ts and this record. Other agents own domain, backend composition, UI and all tests. No retained data, secret files, deployment or publication.

## Work performed
Read roadmap, work-record protocol, Agenda contract, domain barrel, academic policies and RED tests. agenda_red confirmed academic RED exit 1 caused by missing classrooms/index.ts before implementation. Context7 PostgreSQL 17 documentation consulted for lateral latest-attempt reads and deterministic ordering.

Created `apps/api/src/classrooms/agenda-query.ts` (70 lines), `agenda.ts` (57 lines) and public `index.ts` (1 line). One UNION query separates teacher general deadlines from only the actor's expected student obligations. Effective deadlines reuse existing `receptionPolicy`; latest attempt determines pending and resubmission state. Safe target resolution independently rechecks current membership, archive and published activity eligibility, without opening attempts. Calendar ranges use the requested timezone; each item retains the classroom timezone and UTC deadline. No academic writes.

## Verification
- `node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json`: exit 0.
- First `node --test --test-reporter=dot tests/agenda-academic.test.mjs`: exit 1, four subtests passed; submitted/reopened fixture failed on INSERT before projection under `attempt_submission_check` (PostgreSQL 23514, test line 67). Fixed submitted time precedes default real opened time. Reported to test owner; no test changes by this agent, no repeated failing run.
- After agenda_red supplied a valid explicit opened_at fixture, fresh identical academic command: exit 0, six passing tests (five scenarios plus parent); ephemeral database rollback and owned cleanup covered by the helper.
- `git diff --check`: exit 0.
- TypeScript AST structural inspection: all three owned files below 200 lines, largest function 18 lines (below 40).
- Linter unavailable: no configured linter script or installed lint binary found in package.json/node_modules/.bin; no lint PASS claimed.
- Engram project discovery succeeded (`prototipofoxmindmvp-v1`); save rejected by host hook because Codex host session is not registered. Repository evidence remains primary.

## Commits and outcomes
No commit authored by this agent.

## Handoff
Academic A2 port is ready through `classrooms/index.ts`; coordinator integrates API/UI and independent verification. Five scenarios prove dual role privacy, exclusions/exact deadline boundary, first/general deadline extension, submission/reopening and fresh access revocation without academic writes. Extra direct coverage of half-open timezone range, malformed limits, target mismatch and deterministic tie order was suggested to agenda_red/coordinator, not claimed as executed. Existing participation session fallback (`attempt?.individual_deadline_at ?? obligation?.first_submission_deadline_at`) is reproduced intentionally, confirmed with coordinator. No full Agenda completion or commit claimed.
