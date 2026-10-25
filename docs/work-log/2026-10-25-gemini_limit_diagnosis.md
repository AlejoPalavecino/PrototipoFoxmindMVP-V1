# Diagnóstico de preflight Gemini — observación requerida

- Agent / role: /root/gemini_limit_diagnosis, architect read-only.
- Session or task ID: /root/gemini_limit_diagnosis.
- Persisted by: /root, desde informe del agente.
- Date: 2026-10-25.
- Branch/worktree: codex/classroom-activity-ai.
- Starting commit: 3c74eb6.
- Phase/task: [verificación real](2026-10-25-root-activity-gemini-main.md).
- Status: completed (diagnóstico acotado; causa no demostrada).

## Scope and work performed

Inspección read-only de activity-document.ts, worker/helpers DOCX, execution.ts, snapshot/source y adapter. El timeout de parsing de 3000ms incluye inicialización/imports y finally espera terminate; duración total de seis segundos no demuestra esa causa. Otros caminos válidos: límites de bytes/páginas/ZIP/profundidad/caracteres; agregado/orden/sourceId; conteo cero o excesivo. Conteo cero pasa adapter pero prepare lo rechaza como AI_INPUT_LIMIT; valores ausentes/negativos/fraccionarios ya son AI_UNAVAILABLE.

## Verification

No tests, builds, Google, cambios, secretos ni memoria por este agente. Informe requiere observar el punto original de lanzamiento: inicio/resultado de cada parser y presencia/estado/totalTokens del count. Fetch-only no distingue parsing de agregado si no existe count. Sin justificación para ampliar tiempo, presupuesto o límites. El estado técnico BLOQUEADO_POR_AMBIGUEDAD del informe significa observación faltante, no una decisión funcional pendiente del usuario.

## Outcomes and handoff

Sin fix especulativo. Coordinador añadió observación externa al proceso, revisada independientemente, sin cambios de producto. Mantener los fallos originales y contrastar próximas acciones explícitas con esa observación; cualquier fix necesita evidencia y RED específico.

## Continuación — aislamiento por formato listo para RED

Harness parsing-only root reprodujo1/19AI_INPUT_LIMIT con los mismos bytes también procesados correctamente. Demostrado: worker importa PDF/ZIP/XML antes de decidir formato. Inferido, no demostrado: contribución exacta a esos timeouts históricos. Contrato mínimo: modificar sólo activity-document-worker.ts para importar PDF dentro de rama PDF y helpers DOCX dentro de rama DOCX; mensajes, resultados, errores y todas las guardas/deadline3000/recursos intactos.

RED determinista: helper Worker de test usa registerHooks antes de importar worker productivo real; bloquea pdf-lib en DOCX y docx-archive/docx-xml/yauzl/fast-xml-parser en PDF. Exigir texto/warnings o bytes/páginas correctos, sin regex ni dependencia temporal. Actual eager debe fallar; lazy debe pasar. DoT: RED/GREEN, reader/source-limits intactos y parsing-only bajo carga comparable; si timeout reaparece, mantener abierto. Stack limitado del diagnóstico externo puede distinguir timer de rechazo worker;3137ms solo no basta. No pruebas UI/migraciones adicionales por este delta. ESTADO_DISENO: LISTO_PARA_TDD_RED para esa corrección acotada, no aceptación anticipada de fiabilidad.
