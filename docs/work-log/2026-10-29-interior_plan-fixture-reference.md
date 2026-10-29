# Classroom interior synthetic QA fixture — completed

- Agent / role: `/root/interior_plan`, fixture worker; runtime session ID unavailable.
- Date: 2026-10-29; branch `codex/inicio-reference-astra`; base `5ff88e5`.
- Status: completed for fixture preparation; visual and interactive QA remains assigned to the test runner.

## Work

Created `tests/helpers/classroom-interior-reference/{classroom.tsx,harness.mjs,README.md}`. The fixture mounts the actual `ClassroomView` and shared navbar using the pre-existing in-memory `tests/helpers/platform-polish/classroom-data.ts`; wrapper adds scoped class and uses no-op navigation. Available modes: teacher, student, archived, empty, error and loading. Classroom writes, uploads and providers are rejected by the synthetic client. No production API routes, environment files, database or personal data are used.

## Verification and handoff

`node tests/helpers/classroom-interior-reference/harness.mjs` exited0. `node node_modules/next/dist/bin/next dev .test-artifacts/classroom-interior-reference/apps/web --webpack --hostname 127.0.0.1 --port 53196` reported Ready, exec session77432. `Invoke-WebRequest http://127.0.0.1:53196/classroom?mode=teacher` returned HTTP200 after compilation. This does not prove rendered UI, behavior or authenticated E2E. The test runner can inspect the route in the dedicated Ego Space; rerun harness after product `_app.tsx` import changes, as `_app.tsx` is copied, while product components/CSS are linked. Existing unrelated previews were not stopped.
