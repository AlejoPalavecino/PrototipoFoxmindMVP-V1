# Compact event form — independent test ownership

- Agent/task: /root/event_form_red, test_runner.
- Persisted by: /root from the test owner's reports.
- Date: 2026-10-24. Registered runtime session identity unavailable.
- Branch/worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind.
- Starting commit: 374ef3f748ab63ad262bd2d056b693183779da5a.
- Scope: [compact form F0/F5](../../odd/tasks/agenda-compact-event-form.md), tests only.
- Status: completed for test ownership; live verification remains separately attributed.

## Work and evidence

Created `tests/agenda-event-form-{model,editor,view,result}.test.mjs` plus the dedicated helper. Used existing runtime module loader and hook renderer; no production edits, source-string assertions, new test dependency, browser, DB or builds. Initial incomplete-contract RED exposed hour loss and old recovery/navigation behavior; final contract RED29FAIL/0PASS preceded production dispatch. Later independent four-suite plus existing agenda UI/contracts/time/events/client/proxy run passed54/54 (29new +25regression), exit0, no test relaxations after RED.

For the scoped acceptance corrections added four regressions: remote CAS review NONE→WEEKLY requires consent before replacing the entire series; future November and March DST conflicts identify date/city; initial ambiguity names first/second occurrence in chronological order without technical offsets.

Observed RED command: `node --test --test-concurrency=1 --test-reporter=dot --test-name-pattern="CAS review of a remote|future DST message identifies|first ambiguous time choices" tests/agenda-event-form-model.test.mjs tests/agenda-event-form-editor.test.mjs`. Exit1, four expected assertion failures. Only test files changed; production owner receives failures before implementing fixes. Four full suites now contain33cases.

## Handoff

Model owner corrects production without test edits; rerun all four suites and regression launcher, then independent live validation. Coordinator owns docs/launcher/build/commits; no commit authored by this test agent.

Correction evidence appended by coordinator: model owner observed25model/editor and33allformPASS after RED4, without test edits. Coordinator repeated33form+3existingJ3/J4=36PASS on final source. Earlier full launcher69PASS preceded only the scoped CAS/DST correction; backend unchanged. Strict types and production build passed on final source. These coordinator checks do not imply the test owner ran browser/build/DB.

## Independent live focus regression

Verifier observed missing title focus despite inline error. Test owner then added two executable cases in view suite, title and invalid secondary description, exercising real EventForm/effect/ref through existing dispatcher and an observable control that cannot focus while disabled. Details opening was observed, but focus remained on submit after busy unlocked. Pattern `focuses after busy unlock`, view suite:2FAIL/exit1 before production correction. No source assertions/new dependencies or production edits. UI owner receives this RED; previously33form cases remain unchanged.

UI owner subsequently changed only the effect busy guard/dependency and observed35form+3J3/J4=38PASS, exit0. Root observed fresh strict types/production build exit0. Final focus browser recheck belongs to the independent verifier; these results do not replace it.
