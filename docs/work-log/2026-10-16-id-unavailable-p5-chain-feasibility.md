# P5 parallel feasibility — advisory inspection completed

- Agent / role: coordinating Codex, repository inspection and advice only.
- Session or task ID: unavailable; no authoritative runtime identity supplied.
- Date: 2026-10-16 (user timezone).
- Branch / worktree: feat/p33-token-flows, original checkout; separately inspected codex/p4-private-files.
- Starting commit: original 0fd271cf4d2b9186b23a12525f1668efd886612f; P4 767174bc61f2fc3a80c3937c4a0519b1b90523e0.
- Phase and detailed task/spec links: [roadmap](../implementation-roadmap.md), [spec](../foxmind-v1-functional-spec.md) sections 3–6; P4 worktree odd/tasks/p4-private-files.md and docs/private-files.md.
- Status: completed (advice only; no P5 implementation or integrated phase acceptance).

## Request and scope

User asks whether P5 can be developed in another worktree while P3 continues and P4 awaits integration, followed by chained integration. Inspect actual dependencies and recommend a workflow. No worktree creation, implementation, merge or publication requested by this question.

## Work performed

Read the original roadmap, work-record protocol, applicable functional rules, P4 preparation, and the P4 worktree's task/operating documents. Inspected branch/status/log/worktree list and divergent path names. Preserved all existing changes; the only addition is this advisory record.

Original checkout has active tracked/untracked P3 work. P4 checkout was clean at inspection. The original roadmap still says P4 not_started, whereas P4's own roadmap and tasks document isolated implementation/review with actual application integration deferred. These are separate checkpoints; do not overwrite the P3 coordinator's summary from this advisory task. P4 records report build0/68PASS and native dispositions; these checks were not rerun here.

## Verification

- git status --short --branch; git log -5 --oneline; git worktree list --porcelain: exit0 in original checkout.
- git status --short --branch; git log -4 --oneline: exit0 in P4 checkout, no local changes shown.
- git merge-base feat/p33-token-flows codex/p4-private-files: exit0, 33fd80f62b9735e43124dc2df1a4d12c81f01c8a.
- git diff --name-only feat/p33-token-flows...codex/p4-private-files: exit0; P4 includes its own files module plus schema/migrations, package/lock and documentation changes requiring later reconciliation.
- Read official git-worktree documentation: linked worktrees allow different branches/checkouts while sharing repository state. Service/database isolation is a separate responsibility.
- An initial read for odd/tasks/p4-parallel-preparation.md in P4 failed because that original-checkout preparation file is absent there. Corrected by reading it in the original checkout and reading odd/tasks/p4-private-files.md in P4. One overly broad search was truncated; targeted reads supplied the relevant evidence.
- Advisory documentation only: no functional tests, build, services or migration execution needed or performed. Relative links checked separately after file creation.

## Commits and outcomes

No commit, branch/worktree creation, integration, push or PR. Recommendation: start a separate P5 branch from the frozen P4 checkpoint, preserve P3 ownership, isolate P5 database/services, and develop classrooms/membership against explicit identity and file ports. Existing P4 plan promotion must be reused, not recreated. Do not trust client-supplied identity/roles or count fixture authentication as real P3 integration.

## Handoff

If user requests P5 implementation: create its own worktree/record and detailed task scope, fix the inherited stale P3 status only through attributed reconciliation, and define disjoint ownership. Implement full P5 with explicit pending P3 shell/browser integration where unavailable. After P3 is ready, use a separate integration branch/worktree: accepted P3, then P4 with real identity/file proof, then P5 with real classroom creation/enrollment/access-loss/archive/browser proof. Reconcile schema, forward migrations, dependencies and roadmap by evidence at each step; a successful Git merge alone is not acceptance. Do not infer consent for merges/publication from this advisory request.
