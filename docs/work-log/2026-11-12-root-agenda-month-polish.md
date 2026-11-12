# Agenda: first month-view polish

- Coordinator: el Gentleman; session 01a1d135-ccfe-7155-9239-a2cfe29f608b.
- Baseline: main, c702360; checkout ProtipoFoxMind. Initial working tree clean.
- Authorization: human requested iterative UI/UX improvement, selected Agenda and authorized local startup and browser interaction. No commit, push, integration, deployment, dependency changes or paid AI calls authorized for this unit.
- Scope: first bounded correction of monthly grid/cell height mismatch and missing mobile event indicators. Preserve date selection, event rules, permissions, API, storage, other views and existing account data.

## Observed evidence

- Read-only explorer gentle-ai-explore, task mwdxsm5g-1-o76g, mapped the six published pending findings and Agenda-specific source/tests. No explorer edits.
- `npm run local:up`: exit 0, owned local environment ready at http://127.0.0.1:3000; Gemini configured, no generation requested. Existing synthetic account used via ignored credentials file; values not recorded.
- Ego Lite task space 5: login succeeded at /inicio; inspected /agenda, selected an existing populated day, opened details and edit form, cancelled without saving, switched Month/Week/Day, opened and cancelled create form. No event mutations.
- Current browser measurements: desktop monthly rows 86px/cells 92px; 390px viewport rows 64px/cells 68px. At 390px, populated day preview, count and indicators all display:none. No horizontal document overflow in measured 390/320/768px monthly states.
- Other observations outside this first correction: at 320px Week toolbar 160px versus Month/Day 135px; capitalize transforms period headings. At 768px create form Cancel is 120px versus Create 458px. Detail Delete radius 12px versus Edit 24px, gap normal. Day selected card had min-height 0px at 1440px; historical nested-card finding not fully reproduced.

## Failures and limitations

- First login wait used /home instead of actual /inicio and timed out; observed subsequent snapshot proved successful login. No repeated login.
- An overly broad wait for absence of all role=status nodes timed out because an empty status region remains; later inspected actual status text and loaded events.
- Screenshot capture timed out (Page.captureScreenshot); no screenshot evidence obtained and no automatic screenshot retry. Browser DOM/layout evidence is not visual screenshot acceptance.
- One subtree snapshot request used a selector instead of required snapshot ref and failed; corrected by observing full snapshot, no repeated action.
- Browser device overrides reset across CLI invocations; recorded responsive measurements only within the invocation applying the override.
- Ego Lite update offered; not installed. Existing test data untouched. UI inspection is not full accessibility, performance, persistence or role-isolation verification.

## Implementation and checks

- Worker gentle-ai-worker, task mwdy9fz5-2-3sqo, implemented the two-rule monthly CSS correction, tests and canonical Agenda/design guide updates. Own evidence: docs/work-log/2026-11-12-worker-agenda-month-polish.md. Initial routing submission rejected due missing canonical heading after allowed paths; corrected before worker launch, no duplicate worker.
- Parent read back CSS diff and new tests. Changed selectors are limited to Agenda monthly grid; no shared non-Agenda parser/API/CLI behavior changed.
- Worker observed RED with two expected structural CSS failures; GREEN/regression command passed 23 tests. Source contracts do not establish rendered layout.
- `npm run docs:check`: exit 0; 137 files, 832 links, zero issues.
- `npm run local:restart`: exit 0; owned local app rebuilt and ready with candidate source. No AI generation requested.
- Native ASSESS could not assess because of untracked-scope declaration. INSPECT with the exact three intended untracked files returned ready/no existing lineage. A subsequent ASSESS still failed on the same declaration requirement; no further retries or review START. Returned fallback requires writer self-verification, not an independent verifier. No native review verdict exists.
- Browser task space 5 was finished with p1 retained for the user after baseline inspection. Candidate browser verification now requires explicit permission to reclaim that user-owned space; do not create another space or bypass ownership.

## Current state

Human explicitly authorized reclaiming Ego Lite space 5. Read-only verifier gentle-ai-verify, task mwdyymkj-3-w870, checked the rebuilt candidate, delegated due coordinator context backstop. No event mutations or screenshot retries.

| Requested/actual width | Six row heights | All 42 cell heights | Horizontal overflow |
|---|---|---|---|
| 1440/1440 | 86px | 86px | none |
| 768/768 | 86px | 86px | none |
| 600/600 | 64px | 64px | none |
| 390/390 | 64px | 64px | none |
| 320/320 | 64px | 64px | none |

Selected/unselected cells match tracks, zero row overlap. Populated date retained one visible 8x8px event point fully inside its cell at 390/320px; empty date had no points. Existing accessible event count and 42 day buttons retained. Real UI selection exposed matching 0/1 event panels. Month → Week → Day → Month retained selected date. No product blocker observed within this bounded cut.

Verifier-operation failures preserved: retained tab needed adoption after claim because finished space had no managed p1; close-dialog locator was absent after responsive reset removed the sheet; Day wait expected an incorrect desktop wrapper and fresh snapshot confirmed inline Day; final subtree ref stale after CDP, fresh snapshot confirmed Month. No repeated mutations, services, screenshots or upgrades.

Implemented, regression-tested, built and DOM/layout-verified locally. Not committed, integrated, published or deployed. Screenshot-based visual acceptance remains unavailable: original capture timed out, no retry. This is not a full accessibility, performance, persistence or role-isolation audit. Other four findings remain outside this work unit; next bounded improvement is the form/tablet action balance or compact period heading. Local app remains running at http://127.0.0.1:3000; result browser tab is retained for human inspection. Native assessment remains unavailable for untracked scope; no native review verdict claimed. Risk: none (monthly Agenda-only CSS presentation and synthetic tests; no data/security/contracts/concurrency/environment logic changes).
