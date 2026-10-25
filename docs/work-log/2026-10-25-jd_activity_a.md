# Auditoría ciega A — candidato inicial

- Agent / role: reviewer, juez A.
- Session or task ID: /root/jd_activity_a.
- Persisted by: coordinator /root desde informe read-only final.
- Date: 2026-10-25.
- Branch/worktree: codex/classroom-activity-ai, worktree classroom-activity-ai/ProtipoFoxMind.
- Starting target: árbol inmutable f6ef5538bb7a020f0f7650a7986c057cf1f28750; base af48e698aa575733e60a9e900875075dda77e138.
- Phase: [actividades IA](../../odd/tasks/classroom-activity-ai.md), revisión ronda inicial.
- Status: completed (auditoría asignada, no aceptación de feature).

## Request and scope

Revisión independiente ciega del mismo target/criterios que juez B. Sin consultar sus hallazgos; sin fuente, pruebas, Git, memoria, runtime o proveedor.

## Work performed

Skills judgment-day, clean-architecture y caveman-review. Inspeccionó contratos, persistencia/migraciones, fuentes privadas, adaptador, workers/colas/presupuesto, transporte/proxy, publicación, UI y pruebas seleccionadas mediante Git inmutable.

Hallazgos originales:

- A-01 severe, activity-ai/service.ts:30: un start con nueva requestId después de PROVIDER_OUTCOME_UNKNOWN puede eludir el reconocimiento del cargo exigido por regenerate. Propuso reconocer mismo intento lógico y recuperar ese estado al reabrir UI.
- A-02 warning, service.ts:34/62: replay start/regenerate devuelve READY sin revalidar snapshot; apply sí rechaza. Compartir proyección revalidada con GET/list.
- A-03 warning, activity-authoring.ts:156 y activity-history.ts:38/49: historial/entregas reconstruyen topicIds con sólo alias legacy. Hidratar lista real ordenada.
- A-04 warning, activity-ai/source.ts:28: límite agregado AI_INPUT_LIMIT termina HTTP503 por falta de mapping. Conservar código estable de entrada limitada.
- A-05 warning, Activities.tsx:67/ActivityAuthoring.tsx:150: tarjetas/vista previa no muestran unidad/todos los temas; editor sí. Mostrar cobertura curricular real en consulta.

## Verification

`git diff --stat/--name-status`, `git diff --check BASE TREE`, `git show TREE:ruta`, `git grep`: 86 archivos; whitespace sin errores; sólo tests añadidos en ese target inicial. Consulta de classrooms/ai/configuration.ts falló; se corrigió a ai/configuration.ts. No builds/tests/Docker/browser por este juez; hallazgos basados en rutas deterministas del código.

## Commits and outcomes

Sin commits/escrituras del juez. No autoridad de entrega/publicación. El coordinador debe distinguir severe unilateral de coincidencias entre jueces y evidencia posterior independiente.

## Handoff

Fusionar ledger, reproducir casos y revisar delta de correcciones acotado. Verificación visual/funcional permanece responsabilidad del verificador independiente.

## Revalidación ronda 1 — informe atribuido del juez A

Delta f6ef5538bb7a020f0f7650a7986c057cf1f28750 → 01d1bea0029376fe7f56c3d66b65572488fa2898. Resultado scoped APPROVED: A01, A02/B2, A03/B3, A04, A05, B1 y polling FIXED. Sin nuevos severes. `git diff --check` limpio; comprobación en memoria de blobs Git confirmó12SQLhistóricos idénticos byte por byte. Sin tests/builds/browser propios.

INFO A-R1-INFO-01: bootstrap encontraba cualquier UNKNOWN histórico y seleccionaba un antecedente aunque existiera sucesor READY reconocido. El usuario podía continuar abriendo el sucesor manualmente; servidor protegía cuotas correctamente. Propuso recuperar sólo el estado más reciente relevante. Coincide con INFO del juez B.

## Revalidación ronda 2 final — informe atribuido del juez A

Delta 01d1bea0029376fe7f56c3d66b65572488fa2898 → 7d47529b560902f82411a53e2f7fc4ebe90ef94e, únicamente hook2líneas/regresión. INFO FIXED, scoped APPROVED. Sólo se recupera automáticamente el último trabajo si él es incierto; sucesor READY no reactiva antecesor, historial preservado y cero POST al abrir. No nuevos defectos de delta. `git diff`, `git show` y `git diff --check` observados sin errores;20PASS atribuidos al test_runner, no ejecutados por el juez. Sin escrituras/commits/publicación. Dos rondas acotadas consumidas; auditoría cerrada.
