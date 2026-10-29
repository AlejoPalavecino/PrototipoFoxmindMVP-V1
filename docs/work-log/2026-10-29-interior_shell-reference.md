# Classroom interior shell — in progress

- Agent: `/root/interior_shell`, slice worker.
- Task ID: `/root/interior_shell`; memory registration unavailable.
- Date: 2026-10-29; branch `codex/inicio-reference-astra`, base `5ff88e5`.
- Scope: reference-aligned header and existing roster, history and settings presentation. No API, persistent data or unsupported control changes.
- Status: in_progress.

## Work and handoff

Read existing `ClassroomHeader`, `ClassroomView`, workspace CSS and clean architecture rules. The latter three views live inside the coordinator-owned `ClassroomView`; request a tab data attribute to scope CSS rather than change that file. Implement scoped presentation in `interior-shell-reference.css`; coordinator imports it and provides root marker.

Scoped CSS now aligns the existing room cover/header, orange active section tabs, roster rows, code/invitations and settings controls to the references with mobile reflow. It uses real content and retains all existing actions. `ClassroomHeader.tsx` and `ClassroomView.tsx` were inspected but not edited. No external-library API was introduced, so Context7 lookup was not applicable. No test file was changed.

## Verification

`node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false` exited0. `postcss.parse` of the new CSS passed. `git diff --check` exited0 (untracked CSS independently parsed). No boundary-linter or lint script was found in `package.json`; boundary check unavailable. There is no behavior change in this slice, so no new behavior test was run. Visual verification awaits coordinator integration and live QA; do not claim final acceptance.

## Handoff

Coordinator adds `.classroom-interior-reference` as an ancestor of header/navigation/panel, `data-classroom-tab={tab}` on the panel, and imports `apps/classrooms-ui/interior-shell-reference.css` after existing styles. Verify all three views and desktop/mobile with real or synthetic data. No commit or publication performed.

## Integration correction

Reviewer identified the marker is on the same element as `.fm3-classrooms.p5-app`, not nested under `.p5-main`. Updated the scoped selector chains to match that actual ancestry without changing behavior. PostCSS parsed all36 rules and a static assertion found no invalid descendant chains and confirmed the corrected header selector (exit0). Live rendered QA remains the coordinator's responsibility.

QA then measured a desktop top offset: shell padding92px, link44px plus12px margin and header margin10px placed the cover at158px versus approximately52px in the source. At widths ≥1024px scoped shell padding is now6px, link margin0, header top margin2px, with compact header padding and line height. The fixed tool strip is transparent and passes pointer events through except for its actual controls. PostCSS parse passed; QA was asked to remeasure and verify link and tool interaction. No visual pass is claimed yet.

QA recapture measured hero top52/bottom201.65 and tabs top217.65, matching the reference vertical positioning. It found the original topbar location text overlapped the breadcrumb. Hid only that duplicated location label for desktop interior; profile and notifications remain. CSS parse passed. QA was asked to verify breadcrumb and toolbar interaction after correction.

Further QA confirmed breadcrumb interaction and requested the desktop roster/code split. Added a scoped desktop grid when the existing teacher roster has its code separator: roster left, code and invitations right; narrower screens retain normal stacked flow. Existing controls and data are untouched. CSS parse passed; requested live populated/empty roster and control verification before accepting the arrangement.
