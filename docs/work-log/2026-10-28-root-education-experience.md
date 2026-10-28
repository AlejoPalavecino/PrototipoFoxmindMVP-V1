# Education experience — implementation and authenticated review

- Agent/task: /root, sole designer/implementer; registered Engram attribution unavailable.
- Date: 2026-10-28.
- Branch/start: codex/foxmind-ux-redesign, clean 6af6b5e.
- Status: in_progress (visual implementation verified; whole-product production acceptance is not asserted).
- Scope: user requests a distinctly different educational UX/UI direction, styled selection/form controls, shorter workflows and understandable AI waiting states while preserving functionality, fox logo and existing graphics. User supplied the permanent synthetic demo account for actual journeys. Credentials are excluded from source/logs. No remote publication requested.

## Preparation and observed state

Read [roadmap](../implementation-roadmap.md), [work-record protocol](README.md), [functional specification](../foxmind-v1-functional-spec.md), demo guide, admitted startup records and Product Design/ego-browser guidance. Product Design preflight had no saved context. Applied Product Design audit, React self-review and work-unit-commits. No independent/native review is claimed for this explicitly solo session.

Restored the admitted runtime using `npm run api:build` (PASS) and `node .test-artifacts/main-gemini-20261024/preview-auth-dev.mjs`. Existing launcher validated admission/ownership and read-only migration/drift state before starting retained services. No reset, migration, seed, volume recreation or private-configuration output. API 52170, web 52171, Mailpit 52169; supervisor PID49296 at launch. Signed in through UI; credentials never saved in repository files.

## Implementation

Warm canvas, deep green desktop navigation, quieter cards, original fox illustration and horizontal classroom covers. Inicio prioritizes pending work/review and groups resources/aulas, retaining module errors. Agenda shows the nearest deadline and an explicit disclosure for the rest. Native selects gain styled pickers through progressive enhancement with semantic native fallbacks. Original assets and dependencies are unchanged.

AI generation has three steps: topic/objective, material/level, review/generate. Inactive fieldsets are hidden and disabled for native validation; parent state retains values. Only final confirmation calls the unchanged generation client. The current task hides the surrounding list/repeated header. SENDING/QUEUED/RUNNING drive an indeterminate live-announced panel for activities and plan extraction. Recovery, unknown-outcome acknowledgement, dirty replacement and private application gates remain intact. Provider details remain available in a disclosure.

Activity cards retain primary preview/submission actions and group secondary teacher actions. Opening grading hides history, focuses its heading and restores history on return. No grading/publication logic changed. Shared scroll margins accommodate fixed mobile navigation.

Paths: `apps/shared-ui/{workspace*,education*,AiProgress.tsx,index.ts}`, `apps/classrooms-ui/{Home,Activities,ActivityGeneration,ActivityGenerationForm,GenerationSetup,PlanExtraction,AttemptHistory,GradingEditor}.tsx`, `apps/agenda-ui/Upcoming.tsx` and associated education/AI tests.

## Verification

- Test-first: guided setup/progress/activity checks initially failed then passed. Agenda disclosure and grading isolation each failed before implementation and passed afterward. Existing shallow tests now traverse GenerationSetup without weakening zero-POST, unknown-outcome or question-limit assertions.
- Broad regression: 105 tests, 103 PASS, 0 FAIL, 2 historical optional SKIP, 10.56s. Command/output in `.test-artifacts/education-experience-20261028/final-tests.log`: Home, Agenda, role gates, AI recovery/polling/unknown outcomes, questionnaire autosave, history and private grading. Owned database fixtures use rollback, not retained account rows. Agenda's test was subsequently moved unchanged to its own file for the shell commit.
- Earlier broad invocation omitted `--experimental-transform-types`, causing backend loader failures; it also exposed two old direct-button assumptions. Corrected invocation/traversal produced the above PASS. Initial browser selector errors and HMR resets were inspected and corrected, not counted as successful checks.
- Strict web TypeScript PASS. All production routes compiled in `.test-artifacts/education-production-build/apps/web`: isolated web-source copy with junctions to actual shared UI/domain/dependencies avoids replacing live dev output. External user-home lockfile and temporary-copy multiple-lockfile warnings remain advisories.
- Ego Space15: 15 real route/viewport observations (Inicio, Mis aulas, Agenda, profile, settings at 320/768/1440px); 24 real teacher-tab observations (eight tabs at 320/390/1440px). No document horizontal overflow. Geometry is not blanket accessibility certification.
- Actual UI: styled select/Escape; topic selection; next/back retaining input; explicit generation; teacher preview; received submissions; grading entry/return without saving; student Biology consultation without starting; event form without saving; upcoming expansion. Scroll-margin correction resolved reproduced fixed-nav pointer interception.
- Generation document height: 2601px initial flow, 1227px guided flow. Agenda at 1440×1000: 1470px before disclosure, 1026px after. Inicio fits 1440×1000. These are demo-specific observations.
- Two explicit real AI attempts: selected demo PDF returned AI_INPUT_LIMIT; bounded context-only request returned insufficient information. Both left waiting and displayed recoverable errors; two recent jobs retained. Neither created/applied/published an activity. No third paid retry. Successful real AI proposal/application remains unverified; controlled tests cover recovery, edited private application and no publication.
- Final RUNNING activity/QUEUED plan appearance checked in labelled no-request fixture at 53191; not provider success. Earlier pending captures predate final green-background correction. Final mobile grading hides history and focuses its heading; 357px dialog scroll width at 390px.
- React self-review: no new fetch waterfalls, providers or dependencies; native disclosures/fieldsets; stable role/archive controls and payloads. No configured lint/boundary command exists; no fabricated lint PASS. Original public assets unchanged.

## Delivery and handoff

The shell/summary unit was committed locally after staged whitespace and Gitleaks checks passed (259 authored changed lines). Guided-work changes are the next local unit. Diagnostic rounds/screenshots remain in `.test-artifacts/education-experience-20261028/`. Keep the admitted demo runtime available. No existing classroom, draft, event, submission or grade was edited; only two failed generation records added. No attributed Engram writes: runtime registration was unavailable.

After moving the Agenda test unchanged to `tests/education-agenda.test.mjs`, both education test files passed together (7 checks). Final production build passed after the last source/style changes. Generated development-only `next-env.d.ts` path changes were restored to their tracked production declaration; live output directories were preserved.

Whole-product acceptance still requires successful real upload/provider/application and submission/grading persistence journeys, plus Safari/physical-device review. No “100% production-ready” claim or blind generation retry. No push, main merge, PR or deployment.

Rollback: shell/summary unit removes its presentation layer, Home relocation and Upcoming disclosure/tests; guided-work unit restores the original form/list/history presentation and associated tests. No database migration or retained-data rollback is involved.
