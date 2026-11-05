# Brújula — corrección por criterios

- Agent / role: worker.
- Session or task ID: /root/brujula_data_complete (segunda tarea).
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula / compartido.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md).
- Status: completed.

## Request and scope

UI de criterios ponderados y nota final editable autorizada; persistencia y contratos del worker contracts_complete. Publicación explícita, historial inmutable y resultado alumno exclusivamente snapshot publicado. Sin API/esquema/secretos/proveedores. UI usa dirección HTML aprobada; consultadas skills ui-ux-pro-max y landing-page-design para accesibilidad y adaptación existente.

## Work performed

Leídos componentes de corrección/resultado, contratos nuevos, HTML y coordinación de semántica: override opcional preserva/null limpia/valor sustituye, sugerencia incompleta no bloquea nota manual, preguntas mantienen validación histórica.

- `GradingEditor.tsx`: panel de trabajo entregado y panel de corrección; criterios con puntajes individuales, descriptor y peso; sugerencia ponderada exacta reutilizando `rubricSuggestion`; nota final editable con retorno explícito a sugerencia/base. `calculatedGrade` y `overallGrade` quedan separados del override. Guardado envía los marks completos con pendientes null, preserva el flujo de confirmación de publicación y soporta payloads anteriores sin campos nuevos.
- `brujula-grading-rubric.tsx`: controles decimales, errores por campo, cálculo exacto y componente de snapshot publicado. Puntaje cero es válido; valores inválidos bloquean guardar. Estados pendientes muestran ayuda y permiten nota manual según contrato aprobado.
- `PublishedResult.tsx`: muestra exclusivamente `grade.rubricSnapshot` y marks publicados; nunca busca criterios actuales de la actividad ni muestra el snapshot en estado pending.
- `PublishedGradeCorrection.tsx`: aclara que los criterios evaluados se conservan al rectificar la nota final.
- `apps/shared-ui/brujula-grading.css`: composición en dos columnas y apilada responsive, criterios y nota final según dirección HTML existente. El coordinador importa este archivo.
- No se modificó AttemptHistory, API, esquema, Wizard ni autoría. Corregida durante la implementación una lectura local de encoding que había alterado acentos antes de congelar; control final sin mojibake en superficies propias.

## Verification

- RED observado: `node --test tests/brujula-grading-ui.test.mjs` → 0 PASS/3 FAIL por widget ausente y snapshot no mostrado.
- GREEN final: `node --test tests/brujula-grading-ui.test.mjs tests/p8-grading-client.test.mjs` → 8 PASS/0 FAIL/0 SKIP (6 nuevos de comportamiento, 2 contratos históricos).
- Casos nuevos: puntajes→sugerencia ponderada, override separado de nota base, guardado sin publicación implícita, cero, limpiar override→null, payload legacy sin campos nuevos, puntaje inválido bloquea guardar, readonly publicado y pendiente alumno sin snapshot privado.
- `npx eslint apps/classrooms-ui/GradingEditor.tsx apps/classrooms-ui/PublishedResult.tsx apps/classrooms-ui/PublishedGradeCorrection.tsx apps/classrooms-ui/brujula-grading-rubric.tsx` → salida 0.
- `npx tsc --noEmit -p apps/web/tsconfig.json` → última corrida salida 0. Corrida inicial durante concurrencia falló por Notifications.tsx (TS7022/7006); queda explícita como experimento histórico, resuelto en la corrida posterior sin editar ese archivo.
- No se ejecutó navegador para esta unidad: la integración visual y recorridos completos corresponden al coordinador. No se afirma verificación visual ni de publicación real de este candidato.

## Commits and outcomes

Sin commits.

## Handoff

Superficie congelada. Coordinador: importar `apps/shared-ui/brujula-grading.css`, registrar `tests/brujula-grading-ui.test.mjs` en inventario, integrar evidencia SQL del worker de contratos y verificar responsive/recorrido real guardar→recargar→confirmar publicación→resultado alumno. No se marca la fase completa ni se realizó commit/push/deploy.


## Corrección tras revisión independiente — sugerencia y nota final

El reviewer `/root/brujula_complete_review` reprodujo una divergencia real: la nota final mostraba la sugerencia con override null, pero el servidor calcula final como override o base, manteniendo sugerencia separada. En una ASSIGNMENT nueva, 8/5 con pesos 60/40 mostraba 6,80 pero guardaba final null. La prueba previa de limpiar override verificaba solamente el payload null y no modelaba la recarga; ese PASS histórico no cubría esta divergencia.

Corrección autorizada por coordinador: Nota final muestra exclusivamente override o base guardada; la sugerencia permanece separada. «Usar nota sugerida» copia explícitamente su valor exacto como finalGradeOverride, incluido 0.00. «Usar nota calculada» limpia override a null. calculatedGrade null se conserva como base pendiente y no se sustituye con una nota final anterior que podía provenir de override. Sin cambios backend ni publicación implícita.

RED: ampliación de `tests/brujula-grading-ui.test.mjs` → 4 PASS/3 FAIL: final visual diferente de la base, aceptación sugerida enviaba null y nueva ASSIGNMENT fabricaba final visual. GREEN: `node --test tests/brujula-grading-ui.test.mjs tests/p8-grading-client.test.mjs` → 9 PASS/0 FAIL/0 SKIP; nueva regresión modela semántica de API, guardar, recarga, final 6.80 y publicación habilitada, además de limpiar override→base null. No se afirma ejecución backend en esta prueba de componente.

`npx eslint apps/classrooms-ui/GradingEditor.tsx` y `npx tsc --noEmit -p apps/web/tsconfig.json` → salida 0. Superficie congelada para revalidación independiente y recorrido E2E del coordinador. No hubo commit ni publicación.


## Corrección visual del modal — ancho real del contenedor

El E2E del coordinador encontró un defecto real en `failure-0.png` (artefacto temporal foxmind-p9-brujula-Sqr1A8): modal de 560px dentro de viewport1280 mantenía dos columnas; la celda de etiqueta se comprimía casi a cero y el texto quedaba vertical. La regla anterior respondía al viewport y el ancho de puntaje podía crecer a130px; también ganaban reglas históricas de tipografía/bordes.

CSS corregido sin lógica: layout apilado por defecto, container query con dos columnas únicamente cuando el ancho del review alcanza760px; puntaje fijo62px, etiqueta block13px y descriptor12px, pesos inline. Selectores de contexto con especificidad suficiente neutralizan la cascada anterior de18px/bordes marrones en el modal. No se modificó AttemptHistory ni GradingEditor en esta corrección. Inspección visual de la captura fallida y cotejo con geometría HTML efectuados; sin build por instrucción del coordinador. Freeze CSS entregado para que root ejecute build, comprobación label width>80 y capturas390/768/1280/1440. No se declara PASS de navegador antes de esa ejecución.

Ajuste compacto final autorizado por coordinador: botones37px con padding8px13px e inputs39px, siguiendo la geometría HTML y preferencia vigente del usuario. CSS congelado.
