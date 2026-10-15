# P3.3 mailbox compatibility — focused implementation and proof completed

- Agent / role: delegated implementation writer A, mailbox compatibility only.
- Session or task ID: mva3zlb4-g-fiv4.
- Date: 2026-10-15 (parent supplied).
- Branch / worktree: feat/p33-mail-compatibility; shared project worktree.
- Starting commit: 093d26c9ebd63fe1c8c5dee96ae2a53d550b95b3.
- Phase and detailed task/spec links: [P3.3 T1, S1/S2/S3/S4/S7](../../odd/tasks/p33-accounts-auth.md).
- Status: completed (assigned mailbox unit only; no independent-review or P3.3 completion claim).

## Request and scope

User request: "Vamos con el siguiente". User choices: "Mantener formato amplio — recomendado" and "Cadena sobre rama de funcionalidad — recomendado". Implement maintained broad bare-mailbox validation and prove quoted/international delivery through fresh isolated Mailpit, preserving trimmed account spelling and rejecting uppercase domains before normalization. Preserve sender signatures and prior P3.2 behavior except intentional format expansion. Update public contract and guide without claiming HTTP/auth/P3 completion. No dependency/configuration/template edits, Git mutation, sensitive-file access or shared output compilation.

Loaded parent-injected work-unit-commits and nodejs-backend-patterns skills before repository work. Read feature header/specs/bindings/tasks/log, AGENTS, roadmap and work-record protocol. Roadmap still describes the prior P3.2 checkpoint; current authorized P3.3 task and parent-owned feature document supersede its next-work note, not its completion claims. Initial tracked changes package.json/package-lock.json and untracked protocol/parent/mapper/outbox records and feature task belong to others and will be preserved. CodeGraph index absent; no broad structural exploration or initialization writes authorized; use supplied exact paths only.

## Work performed

Record created before source writes. Added private mail-only tsconfig and public-module/SMTP/Mailpit tests before behavior changes. Read installed validator README and isEmail public option types (UTF-8 local allowed, display names/IP domains disabled, dotted TLD required, provider-specific checks disabled). Read existing sender/configuration seam and P3.1 contract/P3.2 evidence and relevant functional-spec sections2/3/12. One guessed helper path and one outdated dependency layout probe returned ENOENT/path-not-found; actual Mailpit helper was then read via the existing integration test import. No secrets or dependency files changed.

## Verification

- `git rev-parse --show-toplevel && git status --short && git branch --show-current && git rev-parse HEAD`: exit 0; branch and baseline as above; pre-existing changes preserved.
- `if test -d .codegraph; then printf 'CodeGraph index present\\n'; else printf 'CodeGraph index absent\\n'; fi; command -v codegraph || true`: exit 0; index absent, CLI available.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json`: initial RED preparation exit0, stdout/stderr empty; compiled only existing mail import closure to private output.
- `node --test --test-concurrency=1 tests/p33-mailbox.test.mjs tests/p33-mailbox-flow.test.mjs tests/p31-contracts.test.mjs`: RED exit1, 19tests/11pass/8fail, 2752ms. Expected failures: missing public helper (2), sender broad-input acceptance (1), real owned-Mailpit quoted/Unicode/trimmed cases (3 plus parent aggregate), schema still email rather than idn-email (1). Existing guard/ASCII/error regressions and8other contract cases passed. No timeout/skips; output contains sanitized MailError only, no raw recipient/token. Evidence is foreground tool transcript; no log file created. GREEN observed below.

- First implementation build with the documented subpath default import failed exit1/TS2349 (not callable under this project's NodeNext/DefinitelyTyped resolution). One bounded correction switched to the documented root default import and `validator.isEmail`; no dependency internals patched or compiler options weakened.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json`: corrected GREEN exit0, stdout/stderr empty.
- `node --test --test-concurrency=1 tests/p33-mailbox.test.mjs tests/p33-mailbox-flow.test.mjs tests/p31-contracts.test.mjs`: GREEN exit0, 19pass/0fail/0skip, 2955ms. Owned fresh Mailpit captured both purposes for quoted-space, Unicode-local/international-domain and trimmed ASCII mixed-case/dot/plus inputs. Public inbox recipient matches exact local spelling and IDNA-equivalent domain. Uppercase ASCII/Unicode rejection left inbox unchanged. Public SMTP fixture independently proves no connection for invalid/uppercase inputs, baseline ASCII/links/lifetimes and sanitized refusal/outage/closed behavior. Foreground transcript only; no log file and no timeout/retry. Development Mailpit not accessed.

## Delivered surface and self-review

- `apps/api/src/mail/mailbox.ts`: public maintained-library `validateMailbox(input: unknown): string`; preserve trimmed delivery spelling, check original Unicode domain case before validator conversion, reject controls/invalid scalars and non-bare mailboxes. No account persistence.
- `apps/api/src/mail/account-mail.service.ts` and `index.ts`: unchanged sendVerification/sendRecovery signatures; both snapshot helper-validated recipient/token before asynchronous transport and export helper.
- `apps/api/tsconfig.p33-mail.json`: mail-only import closure, unique `.build/p33-mail` output; no shared compile or Prisma generation.
- `tests/p33-mailbox.test.mjs` / `tests/p33-mailbox-flow.test.mjs`: public helper/Nest sender, independent SMTP fixture and fresh owned Mailpit public API proof; no private internals or real account/recipient dumps.
- `tests/p32-mailer.test.mjs`: remove only the two surrounding-space negative recipients, now intentionally accepted/trimmed and positively covered by new tests; all other original guard cases retained. Existing root-output P3.2 suite not rerun here.
- `tests/p31-contracts.test.mjs`, `docs/api/accounts-sessions.openapi.json`, `docs/api/accounts-sessions.md`: idn-email format and Unicode uppercase-domain condition; readonly user email reuses shared Email schema;12planned operations/statuses remain unchanged. Offline structure/examples are not full format validation.
- `docs/mail-sender.md`: helper/HTTP422 handoff, account spelling versus standard wire IDNA/SMTPUTF8 representation, exact private commands/evidence and bounded compatibility rollback. Earlier ASCII-subset advisory removed only after real Mailpit proof.
- Own record: this file, created before implementation and finalized with observed evidence.

Self-reviewed assigned S1/S2/S3/S4/S7 against source/tests/docs: no HTTP/frontend/persistence creep; uppercase Unicode is checked before library normalization, trimmed local spelling retained, controls/header/list guards and token shape remain; no logging added; transport/template/config/lifecycle architecture unchanged. Read installed validator implementation only to confirm its actual documented limits (64UTF-8byte local and254code-unit total) and root type export after TS2349. Scoped diff and final status inspection exit0 showed concurrent parent/security/outbox changes outside this unit; none touched by this writer. No additional adversarial/audit/broad sweep performed.

## Risks and limits

- Item2 security: expanded untrusted mailbox surface uses validator13.15.35 rather than custom RFC grammar; controls and uppercase Unicode domains fail before SMTP. Mailpit proves local acceptance, not delivery to a person, account verification, token consumption, HTTP validation wiring or exhaustive RFC syntax. Standard IDNA representation is not permission to persist a rewritten address.
- Item4 concurrency: no DB/identity serialization belongs to this unit. Existing sender snapshots before async I/O, does not pool, and retains bounded in-flight-close implementation; fresh Mailpit and unique build output isolate parallel work. Existing full P3.2 close/timeout tests await the parent's refreshed-root baseline run.
- Item5 dependencies/environment: validator13.15.35/@types13.15.10 installed by parent; reported audit0 is parent context, not rerun. One NodeNext import-type correction documented above. Docker/Mailpit fixture was available and cleaned up only its owned fresh resources. No scripts approved, dependency mutation or sensitive-file access.
- No raw recipient/password/token/link/key values in this record or observed new assertion diffs. No native review invoked/approved by this writer.

## Commits and outcomes

No commits by this writer; terminal Git actions belong to parent. Compatibility behavior/tests/docs form one rollback/review unit, retaining all P3.2 capture/config/templates/data and unrelated writers' work. Generated private output is disposable; no source rollback or Git operation performed.

## Handoff

Assigned A mailbox compatibility work is ready for parent review/independent verification. First unfinished parent action: reconcile the three writer exports, run the refreshed whole-app build and existing P3.2/baseline tests after all settle, then integrate future HTTP validation using `validateMailbox` before lookup/persistence/issuance, map MAIL_INPUT_INVALID to422 and retain its returned delivery spelling. Existing sendVerification/sendRecovery structural sender ports remain stable for outbox integration. Parent owns native-review disposition, Git work-unit chain and shared roadmap/task metadata; do not mark P3.3/all P3 complete from this unit. No current mailbox blocker.
