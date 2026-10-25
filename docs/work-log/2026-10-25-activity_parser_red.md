# Aislamiento de parsers por formato — RED independiente

- Agent / role: /root/activity_parser_red, test_runner.
- Session or task ID: /root/activity_parser_red.
- Persisted by: /root, desde informe del tester cuyo rol sólo permite pruebas.
- Date: 2026-10-25.
- Branch/worktree: codex/classroom-activity-ai, base3c74eb6.
- Phase/task: [diagnóstico de preflight](2026-10-25-gemini_limit_diagnosis.md).
- Status: completed (RED, no implementación por tester).

## Work performed and verification

Creó sólo tests/activity-document-format-isolation.test.mjs y tests/fixtures/activity-document-import-probe.test.mjs. Helper inerte en main thread; dentro del Worker instala registerHooks antes de importar worker productivo .ts real, con execArgv vacío, recursos originales y deadline3000ms. Bloquea dependencias ajenas al formato; exige texto/warnings DOCX o bytes/páginas PDF correctos. Sin regex estática ni espejo de implementación.

`node --test --test-reporter=dot tests/activity-document-format-isolation.test.mjs`: exit1, dos FAIL esperados UNRELATED_FORMAT_IMPORT. DOCX→pdf-lib107ms y PDF→docx-archive164ms, fixture línea13. Fallos confirman imports eager innecesarios, no la causa histórica exacta del timeout. Sin fuentes producto, builds, Git, Google, secretos ni memoria por tester.

## Handoff

Worker debe aislar imports por rama y pasar estas pruebas intactas. Coordinador mantiene integración pendiente de GREEN y verificación independiente bajo carga.
