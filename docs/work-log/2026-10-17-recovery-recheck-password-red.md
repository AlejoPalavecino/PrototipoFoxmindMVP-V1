# P3 password change — meaningful RED

- Agent / role: `/root/recovery_recheck`, read-only test executor.
- Actual task identity: `/root/recovery_recheck`.
- Persisted by: parent coordinator `/root`, from the returned report.
- Date: 2026-10-17.
- Branch: `feat/p33-token-flows`; root workspace.
- Starting commit: `0fd271cf4d2b9186b23a12525f1668efd886612f` with retained candidate changes.
- Phase/specs: P3.3, [P3 completion S1–S4](../../odd/tasks/p3-completion.md).
- Status: completed (RED execution only; not independent feature acceptance).

## Scope and work

Run a fresh real build followed by the four fixed password-change groups, before
the coordinator implements the missing route. No source/dependency edits,
P4/P5 work, secret files or native review operations were performed.

## Verification

`buildApi()` generated Prisma and strictly compiled the API: exit0,8493ms.
Its trusted preparation continuation was passed to
`runPasswordChange(group, preparation)` in the same successful invocation.

| Group | Tests | Result | Elapsed |
|---|---:|---|---:|
| core |4|4 expected failures, exit1|46511ms|
| guards |3|3 expected failures, exit1|9397ms|
| ip |1|1 expected failure, exit1|8578ms|
| races |3|3 expected failures, exit1|9146ms|

All11 actual tests ran, with0PASS/11FAIL/0skip/0cancel. Nine failures came from
the absent route returning404; two boundary tests detected the missing trusted
`beforePasswordChangeCommit` seam. Every group reported actual owned Mailpit
container/volume cleanup0 and database cleanup0. No retry occurred.

The actual test modules sent IPC readiness after18613/1285/1357/1550ms with
`--test-isolation=none`. No startup/work timeout occurred. Every child closed
with status1 and no signal. Complete separate streams and structured results:
`.test-artifacts/p33-password-red-v3/`. Supervisor0 means this prescribed RED
action completed, not that the application passed.

## Outcome and handoff

This supplies writer RED evidence. The coordinator subsequently implements the
feature; GREEN and independent full-P3 verification remain separate. Earlier
failed setup attempts remain in the coordinator record. No commit or delivery
was performed by this actor. Skill resolution: paths-injected.
