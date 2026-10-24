# Folder tab static review — candidate inspection

- Agent / role: reviewer, `/root/tab_shape_review`.
- Session or task ID: `/root/tab_shape_review`; independent session ID unavailable.
- Date: 2026-10-23, America/Buenos_Aires.
- Branch / worktree: `codex/folder-tab-fidelity`, `C:/Users/alejo/.codex/worktrees/foxmind-folders-implementation/ProtipoFoxMind`.
- Starting commit: `ed06f885bfbf08725024013a7a45c9a3a723cfc7`.
- Phase/task: bounded folder silhouette correction; [scope](2026-10-23-root-folder-tabs.md), [design](2026-10-23-tab-shape-design.md), [roadmap](../implementation-roadmap.md).
- Status: in_progress.

## Request and scope

Independent static review of CSS/SVG cascade, native controls/focus, long text, asset paths and preserved API/state boundaries. Own only this record; no source/tests, memory, commits, publication or deployment. Apply caveman-review to real findings. Live visual acceptance belongs to the coordinator/verifier.

## Work performed

Inspected the selected reference pixels using view_image, the complete new folders-tabs.css and SVG variants, its last import from folders.css, prior shell/account/academic styles, design tokens, actual account/profile/Home/classroom/wizard consumers and the standalone import/server configuration. Observed an in-flight foreground ::after addition and re-read the later stylesheet before findings. No other agent's edits were changed.

## Findings

[MEDIA] apps/shared-ui/folders-tabs.css:3 : Root-relative /folders/tab-frame-*.svg exists only in apps/web/public, but the standalone ClassroomsApp imports this CSS while scripts/p5-runtime.mjs configures Vite at apps/p5-preview with configFile:false and no shared publicDir; that host cannot resolve the new frame assets, leaving headings without their new frame after border/background are removed : Bundle the SVG via stylesheet-relative URLs or explicitly expose the shared public directory in that host, then verify both Next and standalone resolution.

No additional demonstrated defect in inspected cascade/focus/text handling. This statement is scoped static review, not visual PASS. New SVGs contain geometry only; tone fill values match existing yellow/mint/coral tokens. Native elements, handlers, routes, semantics and API states are unchanged by this candidate. SVG outline color differs from the panel outline token; this is not escalated as a functional finding without live mismatch evidence.

## Verification

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git diff --stat`, targeted diffs/rg/reads: observed candidate on the branch/HEAD above. New stylesheet/assets are untracked and were read directly; tracked diff alone does not contain them.
- `git diff --check`: PASS, exit0.
- `git diff --name-only` / `git diff --cached --name-only`: no changed or staged test files; no environment/schema/migration file changes.
- Initial exploratory rg calls included absent paths/PowerShell wildcard literals and returned path errors; corrected searches over existing directories supplied the evidence. These are lookup errors, not application failures.
- Build/typecheck: not independently rerun here; worker record reports actual production build/typecheck PASS. No result is inherited as reviewer-observed proof.
- Runtime browser, keyboard, responsive, long-text/zoom and forced-color checks: not performed by this static review. Coordinator reports ego capture unavailable; fallback authorization remains coordinator-owned. No rendered fidelity or whole-feature DoD acceptance claimed.

## Commits and outcomes

No commit performed. Candidate requires standalone asset correction and actual browser acceptance before overall closure.

## Handoff

Coordinator owns disposition/fix of the standalone asset finding. Re-read the resulting candidate/import paths, then record a scoped final static verdict; coordinator/verifier still owes live account/profile/Home/classroom/wizard/navigation proof. Do not infer publication consent from this review.
