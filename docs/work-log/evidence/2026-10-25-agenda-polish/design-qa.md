# Agenda reference matching — independent visual QA

- final result: passed
- Tester: /root/agenda_polish_test; reviewer: /root/agenda_polish_review; persisted by /root because child roles cannot author documentation.
- Date: 2026-10-25; main startinge637cc9. Target: [approved Agenda](references/agenda.png), with the separately approved navbar retained intentionally rather than copying the mock's approximate logo/navigation.

## Proof scope and frozen navbar

Native ego renders of actual Agenda/AppNavbar/_app CSS through isolated source-junction harness53271 with typed in-memory AgendaClient responses/actions. This is component/API-fixture proof, not authenticated E2E or retained event/account acceptance. User's actual-state screenshot was not copied into test data. No real event/account/API/database/provider/configuration mutation.

AppNavbar a38979a600128884860beffd2b615886d76b305f, NavbarParts9d4c325b43cfa4a2b6a2d3514e383ea26de799fc, shared navbar CSS4f05ef33bb549b45572840df7ca41dec7cccd88c and Home navbar CSS41db1631bb89c0af7b6b9191d88b294f6e650c83 remain exactly unchanged. Agenda CSS variables/selectors stay inside agenda-main/dialog; native navbar preserves18px/600 and slate/peach. No new global search is invented from the mock.

## Accepted rendering

Final stable eleven-view sweep after explicit Segoe16 body adjustment: [reference1536](final-reference-1536.png), populated [1536](final-populated-1536.png)/[1920](final-populated-1920.png)/[768](final-populated-768.png)/[390](final-populated-390.png)/[320](final-populated-320.png), empty [1536](final-empty-1536.png)/[390](final-empty-390.png), [weekly/all-day](final-all-day-1536.png), [loading](final-loading-1536.png), [error](final-error-1536.png). Source mock and desktop were opened together; sidebar/calendar proportions, headings, Today toolbar, selected-day cards/date tiles, legend, color and illustration inspected. [Dimensions](final-dimensions.json) records actual viewports and42calendar buttons in every view.

No actionable P0/P1/P2 remains. Calendar deliberately keeps42dates/six weeks, compared with the generated mock's five visible weeks; date logic was not changed for a screenshot. Actual metadata/descriptions and empty/loading/error content remain truthful. No horizontal overflow in eleven views. Controls have≥44px height; at320px, seven-column day cells are38.51×64px (not44×44); other controls≥44px in both dimensions. This explicit fit exception is not hidden by a universal-touch-target claim.

[Detail proof](detail-proof.json) records seven measured contrasts (minimum5.73:1; New event CTA7.25:1, heading19.08:1), visible lavender keyboard focus, [mobile dialog](dialog-320.png)320×812 bounds288×780 without overflow and Escape focus restoration. Outline was computed2.4px in this native environment; no physical-device, native200%zoom, pixel-identity or full-WCAG certification.

## Behavior and regression proof

RED: first4pure-helper tests failed ENOENT before agenda-presentation existed; extended semantic suite observed6RED/1PASS (the existing42cells invariant passed). GREEN independent command:

node --test --test-reporter=dot tests/agenda-polish-presentation.test.mjs tests/agenda-ui.test.mjs tests/agenda-client.test.mjs tests/agenda-event-form-model.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-event-color-view.test.mjs →53PASS, exit0. Baseline existing seven files46PASS; worker different focused set36PASS, not added as unique tests. Strict fixture TypeScript PASS2.1s; product web types passed independently.

Pure helpers verify date-only weekday/day/month/year stable at UTC noon, deadline midnight/month/year in supplied classroom zone, ALL_DAY without instant conversion, timed occurrence in saved event zone, multi-day ranges and no input mutation. Full date/zone context is retained alongside concise time. No calendar.ts/hooks/API/domain/EventForm/CRUD contract change. Today moved to monthly toolbar with the same callback; selection/prev/next/current-date/focus IDs, privacy, category, recurrence, role, pending/resubmission and authorized targets remain.

[Interaction proof](interaction-proof.json): seven grouped fixture checks cover local validation/no request/focus, create, revision-CAS edit, conflict/review retaining changes, activity open, month/Today and viewer-zone change without changing deadline original zone. Additional detail checks cover keyboard and dialog behavior. Mock API actions are in-memory only; this does not claim real persistence verification.

Root final isolated production Next build passed within180s,5.55s command wall, TypeScript2.1s/compile650ms, after synchronizing all final Agenda source. No live .next overwrite. Worker PostCSS85scoped rules/diff-check/source limits passed; no configured linter, no invented linter PASS.

## Review, historical experiments and cleanup

Read-only reviewer personally checked final diff, nine relevant views including final reference/body16, lower reference mobile and dialog, unchanged existing tests/.env/Prisma/core/calendar/hooks/forms/navbar hashes, and diff-check PASS. It read the eleven-view metrics/interactions and returned LGTM_SIN_HALLAZGOS,0findings; build/tests remain attributed to their actual actors. Reviewer did not edit, run services/data, commit or write memory.

Baseline showed a905px calendar/320px selected column and upcoming beginning y945. Wrong native-dialog selector and ambiguous focus locator timed out initially; snapshots established tool-selector errors, corrected in later rounds without weakening assertions/source. Earlier transition-state captures were not accepted: selected-state-proof.json documents active CSSTransitions. Final browser-stable-final.mjs waited for completion and moved the pointer away before replacing all eleven authoritative captures. Intermediate/action screenshots remain their own evidence, not mislabeled final comparisons.

Owned Space qa-agenda-polish(id6) finished exactly once with keep[]; only harness session62668/port53271 stopped. Live52171PID25740 and52170PID42496 remained. No retained events/accounts changed; no push/deployment. Runtime identity was unavailable for attributed memory writes; repository record is the durable handoff.
