# Student roster scroll visibility — investigation

- Agent: /root/ui; session ID unavailable; 2026-10-28.
- Worktree: foxmind-student-publication/ProtipoFoxMind, branch main, starting commit 7e58b3528a4ebe5410ccf3c7c11da6bcdc244385.
- Scope: investigate roster summary button overlap and correct minimally only after confirmed RED; no test or credential changes. Status: in_progress.
- Prior observed demo viewport 894×486: after navigation, summary button at y≈4 was under header; moving scroll placed it under bottom navigation, and a further scroll revealed it and allowed click. This is not evidence of a permanent block.
- Inspected ClassroomView, shell styles, work-record protocol and web agent rules. Existing controls already define scroll padding/margin; shell uses sticky top and fixed bottom navigation. The trigger is not yet established. RED requested from /root/red.
- Next: await reproducible fixture and exact failing test before production edits.

## Implementation and verification

- /root/red confirmed RED with synthetic fixture at 894×486: after scrolling then opening Alumnos, first summary button top 42.28px was covered by HEADER.
- ClassroomView.tsx: retain roster ref; when teacher selects Alumnos and the first summary button falls outside the existing 140px/100px safe margins, center it with scrollIntoView. The focused element is not changed; already visible buttons do not cause a scroll.
- Independent /root/red GREEN: same fixture, top 279.75px and bottom 323.75px; hit target BUTTON, keyboard Tab reaches the unobscured control; screenshot inspected. Synthetic fixture only; not a device/browser compatibility claim.
- `npx tsc --noEmit -p apps/web/tsconfig.json --pretty false` PASS; `node --test --test-reporter=dot tests/p8-progress-client.test.mjs` PASS (2); `git diff --check -- apps/classrooms-ui/ClassroomView.tsx` PASS. Boundary linter unavailable/not configured.
- Status: completed for observed scenario. No production service, data or credential changes; no commit. Coordinator owns integration, regression and final review.

## Roster mutation follow-up

- Independent reviewer identified repeat scrolling when roster length changes. /root/red reproduced RED using an in-memory synthetic delayed roster update: one unwanted scroll call.
- ClassroomView now waits for initial roster load and consumes reveal only once per entry to Alumnos, including an empty roster. Subsequent roster updates do not recenter. Independent /root/red GREEN for both visibility and mutation scenarios; web TypeScript PASS. Synthetic server 54831 stopped.
- Awaiting coordinator's updated local application for authenticated pointer/keyboard verification; no credentials or user data were accessed in this follow-up.

## Authenticated local verification after restart

- Coordinator reported updated local application at commit 6a4db72. Ego-browser Space 34 used the rotated synthetic demo credentials privately; no credential values or report contents were logged.
- At 894×486, after scroll to 500 and selecting Alumnos, summary button top 258.45px/bottom 302.45px and center hit the button. Pointer click opened the dialog.
- After closing, four Tab presses from Alumnos reached the summary button at top 279.75px/bottom 323.75px; center hit the button and Enter opened the dialog. Space closed. Read-only interaction; no roster or account changes by this agent.
- Result: observed authenticated local pointer and keyboard paths PASS at this viewport; physical devices, other sizes and browsers remain outside this proof.
