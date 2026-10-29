# Inicio reference work units — in progress

- Agent / role: /root coordinator.
- Session or task ID: /root.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra, isolated managed worktree.
- Starting commit: 9fa596c37774353390835eb41c7cb2f8d480644a.
- Phase/task: requested Inicio redesign; [Home behavior](../p9-home.md).
- Status: in_progress.

## Scope and review boundaries

Local, independently reviewable units under 400 authored changed lines. Preserve the final working tree while preparing staged snapshots; test each staged source snapshot, not only the final working tree.

1. Exact activity-summary projection and rendering with its focused tests. No composition dependency; rollback removes the new projection/component/tests.
2. Home visual foundation and cover cards, including scoped style import and reference root class. Existing navigation and hero remain usable before the composition changes. Rollback removes the scoped CSS/class and cover presentation changes.
3. Reference composition, functional shortcuts, new hero assets and behavioral tests. Uses the already-delivered summary and visual foundation. Rollback restores prior Home composition without touching backend or stored data.
4. Synthetic QA fixture, visual evidence and attributed documentation. No runtime behavior change.

## Verification and outcomes

Source review and final bounded browser QA are independently owned by reviewer/test_runner; see their attributed records. Each staged unit still requires observed snapshot checks, whitespace check and staged gitleaks before its local commit. Commit identities will be appended only after creation.

- Unit 1 staged snapshot `.test-artifacts/review-unit-1`: `node --test --test-reporter=dot --test-concurrency=1 tests/home-reference-summary.test.mjs tests/home-polish-presentation.test.mjs` passed 7 tests/exit 0. Staged whitespace check and `gitleaks protect --staged --redact --no-banner` passed; no leaks. Reviewer approved this independently usable unit. No browser boundary is introduced until composition integration. Commit not yet created at this entry.
- Unit 1 committed as `0f26eb239293ac9be2c0aa8b1bb843164fc40c25` after the recorded checks (119 authored changed lines including record).
- Unit 2 staged snapshot `.test-artifacts/review-unit-2`: summary, presentation, refinement-copy, miniagenda, workspace-disclosure, education-experience and p9-home-client suites passed 27 tests/exit 0 with `node --test --test-reporter=dot --test-concurrency=1`. The snapshot contains the original composition plus only its new root class and visual/card changes; the working tree's later composition was not substituted. Staged whitespace passed. Reviewer approved the progressive boundary; final responsive visual evidence applies to the completed composition. Commit pending staged secret scan.

## Handoff

Prepare and validate the staged units in the order above. No remote publication or deployment requested.
