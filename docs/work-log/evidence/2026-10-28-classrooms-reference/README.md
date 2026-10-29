# Mis aulas reference QA — 2026-10-28

final result: passed — bounded frontend fixture verification.

Agent `/root/test_runner`; starting HEAD `f0dc59a5d94558e97dd7b203e359d183be27923b`, branch `codex/inicio-reference-astra`. [Work record and execution incident](../../2026-10-28-test_runner-classrooms-reference.md). Fixture53194 uses real ClassroomsApp with a synthetic client whose supported effects stay in page memory; it has no production API proxy.

## Reference comparison

[Original1784×881](user-reference.png) and [final desktop1784×882](final-1784-grid.png) were opened together. Ego rounded the requested881px height to882px; screenshot pixels were not resized. The warm panoramic hero, existing sidebar, orange actions, horizontal cover cards, local toolbar and actual pending invitations/drafts follow the selected direction. Unsupported progress rings, rosters, schedules, message/AI destinations and fabricated pending metrics were excluded by the contract. Role order and displayed facts come from the real DTO shape.

| Surface | Evidence | Observed result |
| --- | --- | --- |
| Wide desktop | [Final1784](final-1784-grid.png) |220px hero, approximately182px cards; two columns, real counts |
| Narrow desktop/tablet | [Final1024](final-1024-grid.png) | Actions separated from Foxy's body;1600px image loaded |
| Mobile entry | [Final390](final-390-grid.png) | Wrapped controls, readable actions, decorative hero art hidden |
| Mobile list/keyboard | [Final320 list card](final-320-list-card.png) |82px cover,193px content, full label and visible focus |
| Pending invitations/drafts | [Final390 pending](final-390-pending.png) | Both actual fixture entries and actions remain reachable |

Initial observations exposed tall desktop cards, tablet CTA overlap over Foxy's paws, and a120px list cover squeezing320px content. All were corrected and recaptured. The pending section starts slightly lower than in the bitmap because the actual collection status and invitation/draft details remain; vertical scrolling is intentional. No unresolved P0/P1/P2 visual issue remains in inspected states.

## Behavior and state proof

- [Local control receipts](controls.json): teacher search; role+state+year+division intersection; hidden criteria retained; clear preserves role/search; keyboard grid/list toggle preserves ordering. Four initial reads remain four throughout local controls; no mutation or extra request. Pending content remains intact.
- [Flow receipts](flows.json): invalid code error, preview with zero confirmations, explicit confirmation exactly once, one invitation acceptance producing an in-memory membership, and create opening the real wizard. These are synthetic effects, not real enrollment/creation.
- [State receipts](states.json): loading, recoverable error/retry, empty collection without pending entries, busy join lock, Escape without confirming, draft resume and classroom entry.
- [Clear-focus regression](clear-focus-final.json): initial keyboard Enter on Limpiar filtros moved focus to BODY. The final implementation focuses permanent Más filtros, preserves role/search, restores matching cards and continues Tab to Vista de tarjetas. This P2 was reported by independent review and verified after correction.
- [Final matrix](responsive-final.json):1784,1440,1024,768,390,320 and320 list; no document overflow, clipped labels or visible targets under44px. Earlier long-name320, many24-rooms1440 and archived390 states also fit. [Artwork/pending recheck](art-and-pending-final.json) confirms1600px hero selection at768/1024 after the last image-size adjustment.
- [Runtime window](runtime-errors.json) and [latest window](runtime-errors-latest.json):1196 and525 buffered Runtime/Log events respectively, with no observed error/exception entries. This is bounded observation, not a claim about unobserved sessions.

New tests observed RED0PASS/6FAIL, then focused GREEN13PASS/0FAIL, repeated after the focus fix. Legacy collection assertions were preserved through a helper that expands only the extracted stateless filter children. Fixture strict TypeScript passed. Coordinator owns production build/review acceptance.

## Limits and incident

This is not authenticated backend E2E, real classroom creation/enrollment, physical-device/Safari, native review or native zoom acceptance. No upstream auth or real account was used by the browser fixture.

An initial test-selection error nevertheless ran the database cases embedded in foxmind-3d-regressions.test.mjs, contrary to the no-database task boundary. The coordinator was notified immediately. Source inspection shows an owned temporary PostgreSQL container, transactional rollback and owner-checked automatic removal; observed test output exited0 but did not separately log cleanup. No further database access or cleanup was performed. Those cases are excluded from acceptance; the work record preserves the incident rather than claiming a database-free execution.

Ego Space38 is the task's dedicated space; previous finished spaces were not reused. The final result is retained for user review at the local fixture.
