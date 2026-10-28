# Isolated platform presentation fixtures

Run from the repository worktree:

```powershell
node tests/helpers/platform-polish/harness.mjs
node node_modules/next/dist/bin/next dev .test-artifacts/platform-polish/apps/web --webpack --hostname 127.0.0.1 --port 53181
```

The menu is `http://127.0.0.1:53181/`. The wrapper has `data-qa-fixture="true"`.
Every UI is a real product component importing current product CSS. This is
component presentation QA, not authenticated E2E, backend authorization or persistence proof.
No `.env`, production API route, server loader, DB, seed or provider is used.

An optional different source is supported as the first argument, with a fresh
artifact-directory name as the second. Use a new destination for each source;
existing junctions deliberately are not rewritten. Start that fixture with the
source's own Next installation and a separate loopback port to keep React coherent.
Both generated `.next-platform` caches live under their ignored artifact folders.

| Route | Variants / interactive surface |
|---|---|
| `/inicio?mode=` | mixed, teach, study, none, teach-empty, study-empty, archived, error, loading; inherited real Home fixture |
| `/agenda?mode=` | populated, empty, reference, all-day, error, loading, conflict; real modal, create/edit/delete in memory |
| `/mis-aulas?mode=` | populated, empty, error, loading; search/role filters, three navigable cards, join dialog |
| `/classroom?mode=` | teacher, student, archived, empty, error, loading; Plan, Library, Wall, Activities, Progress, roster, history, settings tabs |
| `/grading?mode=` | populated, error; real private grading form |
| `/wizard` | complete real wizard, populated synthetic draft; draft edits live only in a closure |
| `/learning?kind=attempt&mode=` | assignment, questionnaire, evaluation, submitted, readonly; real attempt dialog and child forms |
| `/learning?kind=authoring&mode=` | assignment, questionnaire; actual authoring form and questions |
| `/learning?kind=generation` | actual AI form/source selection; provider calls disabled |
| `/learning?kind=result&mode=` | populated, pending; actual published result section |
| `/sign-in`, `/register` | actual AccountScreen; unauthenticated synthetic session |
| `/forgot-password` | actual recovery-request form |
| `/recover-password?mode=token` | actual password form with literal synthetic proof; omit mode for missing-proof state |
| `/verify-email?mode=token` | actual verification form with literal synthetic proof; unverified synthetic session |
| `/profile`, `/settings` | actual account screens and synthetic verified session; `mode=error` exercises read failure |
| `/files` | actual page with no-context state |
| `/files?kind=classroom&id=11111111-1111-4111-8111-111111111111&purpose=material` | actual private-file form and quota; no upload or file bytes |

Account writes return an explicit fixture error. Classroom writes and attempt saves
are rejected except Wizard draft edits retained in its local client variable.
The Agenda fixture retains private events in memory. Reloading resets fixtures.
Download/preview links intentionally have no private file payload; `/fixture-file`
is not implemented. Opening real upload pickers is not needed for layout proof.

Loading fixtures deliberately remain pending. Unknown API paths fail explicitly.
Teacher/student filtering is represented in synthetic responses; it does not prove
server permissions. AI proposals, file validation/scanning, published correction
history, real autosave/submission, cooldown time passage and provider behavior are
outside fixture proof. Viewports, pixels, keyboard and browser console verification
belong to the coordinator's separate IAB evidence.
