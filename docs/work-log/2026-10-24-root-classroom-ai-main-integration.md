# Classroom AI integration into main — in progress

- Agent / role: /root / coordinator
- Task ID: /root; authoritative memory session unavailable
- Date: 2026-10-24
- Worktree: integrate-classroom-gemini (detached preparation from local main)
- Starting main: 10a33d3535d0c4ebdfdaeac033bd6e7a3f348dce
- Source branch: codex/classroom-gemini at 25d20c6a61b9b6a3f197f44c8e1f7ad34c298682
- Feature: [classroom AI extraction](../../odd/tasks/classroom-ai-extraction.md)
- Status: in_progress

## Authorized scope and preservation

User explicitly requests integration of classroom-gemini into main, preserving other modifications, local commits only without push. Original checkout is actually feat/p33-token-flows at4395484 with unrelated untracked design/memory/work records; it stays untouched. main already contains28 newer agenda commits from common baseed06f885; Gemini contains23 distinct commits. Separate managed worktree used for integration to preserve classroom-gemini runtime/private ignored configuration and other checkouts. No stash, reset, prune, remote mutation or retained database migration execution. No secrets read/copied. Main's old registered checkout is absent, confirmed by path existence; no live main worktree is mutated.

## Preparation

Read roadmap/work-record protocol and relevant feature continuity. Explorer /root/gemini_merge_bootstrap performed read-only current_project/context/search under prototipofoxmindmvp-v1, no memory writes because registration is unavailable. Its sandbox Git status failed; coordinator elevated status observed clean source25d20c6. This is a sandbox visibility limitation, not a worktree repair. Root original branch/status and all local/remote-tracking refs snapshotted for later equality checks; no private file contents read. Cached origin/main10a33d3 is not claimed fresh from network; no fetch needed for local-only integration and no new migration is introduced.

git merge-tree --write-tree main codex/classroom-gemini detected11 conflict paths: application composition, domain barrel, roadmap, shared integration runtime/services, six P4/P5/P8 tests. Resolve by preserving agenda and AI composition/lifecycle, both schema migrations and tests. Build and bounded relevant tests plus independent review precede moving main using expected-old-value atomic update. Existing authored work units remain intact; merge reconciliation is reviewed against both parents.

## Handoff

Pending: perform merge in detached integration worktree; resolve conflicts preserving both feature contracts, verify combined candidate, review, local merge commit, atomic main update and preservation checks. Record actual commands/results/failures and commit identities after observation. No push or PR.

## Resolved integration and observed checks

Resolved11conflicts preserving both sides; additional migration checks retain full main with a colored Agenda event. Added same-host AI-enabled Agenda privacy/color smoke and direct shared-barrel regression. [Explorer](2026-10-24-gemini-merge-bootstrap.md), [architecture](2026-10-24-gemini-merge-architecture.md), [source](2026-10-24-gemini-merge-source.md), [test runner](2026-10-24-gemini-merge-tests.md), [review ledger](2026-10-24-gemini-merge-review-ledger.md) are attributed reports persisted by root.

Dependency installation npm ci --no-audit --no-fund --ignore-scripts exited0,389packages, isolated node_modules. API build and Next production build passed initially and again after the small source fix; strict API/web types passed within those builds. Shared P5 integration tests and international invitations exited0 under360s, real deploy/diff/history12 checks and process/owned cleanup0, nested web/client16PASS. No repeat was needed after the behavior-preserving error syntax correction.

Initial combined suite failed from AgendaError parameter properties exposed by barrel union (reported122PASS/34FAIL dot events). FocalRED0/1 preceded correction; focalGREEN1/0 followed explicit property declaration preserving semantics. Both blind reviewers confirmedB1 and both scoped rejudgments found it resolved. Final same-suite+regression result: 174PASS/0FAIL/0SKIP,exit0,duration72919.0617ms. No Gemini calls or new visual claims; previously accepted real PDF/DOCX/mobile paths remain unchanged.

Preservation checker initially confirmed132main-exclusive/135AI-exclusive paths unchanged and all three new migration blobs unchanged. Final exception is the explicit AgendaError compatibility block, independently reviewed and tested. Original checkout head/branch/status and every other branch/remote-tracking ref remain unchanged. No secrets read/copied, no runtime shutdown or retained-data modifications.

## Local delivery plan

Final product tree is fixe8df4116; only attributed records/checkpoint documentation will be added before merge commit. Existing23AI work units remain as history; no squash/rewrite. The merge brings reviewed history and fewer than400 newly authored reconciliation/test/doc lines; no generated-code compression or artificial test split. Rollback requires a separately authorized revert of the merge, preserving other branches. After observed merge identity, root advances local main with expected-old CAS only if old main/source/other checkouts still match; stale registered main path must remain physically absent. No push or PR.
