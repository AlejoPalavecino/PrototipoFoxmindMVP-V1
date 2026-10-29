# Isolated Inicio presentation fixture

Run `node tests/helpers/home-reference/harness.mjs` from the repository root, then use the printed Next command. The generated app lives under ignored `.test-artifacts/home-reference` and uses production components/styles with synthetic data. It does not connect to authentication, databases or external providers.

Open `/inicio?mode=mixed`; supported cases also include study, teach, none, archived, error, unknown, long, many and loading. Callback results are exposed through the fixture output; no classroom mutations occur.

The fixture copies the real Next app entry and PostCSS configuration. After editing fixture data, copy only the changed fixture file into the generated app; recreating its Next config can restart a running server.

`browser-01.mjs` through `browser-09.mjs` are historical one-run QA evidence from this task. They contain session-specific Space/page IDs and absolute evidence paths. Do not replay them as a reusable regression suite. For a new browser task, follow ego-browser's current skill, create/resume the appropriate owned Space, inspect its current state and write fresh scripts.

Behavior assertions live in `tests/home-reference-summary.test.mjs` and `tests/home-reference-dashboard.test.mjs`. Visual results and known limits are retained in the task's work records.
