# Gemini Developer token count — RED independiente

- Agent / role: test_runner.
- Session or task ID: /root/gemini_count_red.
- Persisted by: coordinator /root; rol tester sólo editó pruebas.
- Date: 2026-10-25.
- Branch/worktree: codex/classroom-activity-ai, base3c74eb6.
- Phase: A2 compatibility, [solicitud actual](2026-10-25-root-activity-gemini-main.md).
- Status: completed (RED, posterior GREEN pertenece al worker/reviewer).

## Scope and work performed

Creó tests/activity-gemini-count-compatibility.test.mjs con GoogleGenAI2.31.0 real y HTTPloopback efímero, clave ficticia. Ajustó únicamente la igualdad de contents en testadapter para exigir prefijo completo instrucción/schema y sufijo original intacto; preserves PDF/text, controles, privileged instruction de generación, ausencia de tools, límites y parser local. No producción, secretos, Google, documentos o Git por tester.

## Verification

Antes de GREEN: `node --test --test-reporter=dot tests/activity-gemini-count-compatibility.test.mjs`:3FAIL,0PASS exit1, AI_UNAVAILABLE antes del transporte; escenarios de presupuesto/output se detenían en preflight. Adapter existente6PASS/1FAIL por ausencia del prefijo requerido. Diffcheck exit0. Fixture deadline3000ms sólo para SDK/HTTP frío, no producción.

SDKlocal countTokensConfigToMldev rechaza systemInstruction del count en DeveloperAPI. La regresión usa transformador real y no sólo mockmodels, para no ocultar esa incompatibilidad de modalidad.

## Handoff

Implementación worker exclusiva activity-adapter.ts; posterior10PASS observado por worker y reviewer. Verificación Google real pendiente en su entorno separado. Sin commits ni Space por test_runner.
