# Progreso de aula: paridad con UI Lab

- Agente: /root/classroom_progress, delegado por /root.
- Fecha: 2026-11-16. Rama: codex/foxmind-product-parity. Base: ef6828b96084b0fcaf9a883e4afb95e0871cf1d6.
- Worktree: C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind.
- Autorización: Progreso/Mi progreso y recorrido individual contra teaching-room.js/css de UI Lab; preservar trabajo concurrente, permisos y publicación explícita.
- Superficies propias: Progress.tsx, StudentRecord.tsx, CSS dedicado parity-classroom-progress-exact.css, pruebas propias y este registro. Backend/contratos requieren coordinación. Sin commits, proveedores, datos retenidos, arranque ni navegador propios.

## Hallazgos comprobados

- La proyección inicial no distingue revisión privada de falta de devolución; tampoco contiene avance por unidad. Comunicado al coordinador antes de editar contratos.
- Mi progreso convierte porcentaje ausente en 0%; el dominio exige ausencia cuando no hay denominador.
- Falta cola de próximo acompañamiento docente y El camino de la clase estudiantil; recorrido individual usa tarjetas distintas de la referencia.
- Las reglas móviles previas apilan las tres métricas hasta 1000px, mientras la referencia conserva tres columnas hasta 520px; resumen propio no se centra en móvil.

## Evidencia inicial

Leídos AGENTS.md, base documental, arquitectura, guías de corrección/progreso, contrato, servicio/repositorio y referencia UI Lab. HEAD y árbol inspeccionados: cambios anteriores y concurrentes presentes. Un rg con glob literal tests/p8* falló por sintaxis Windows; lectura directa de pruebas sí completada.

## Estado

VERIFYING. Backend/UI congelados para build y QA del coordinador; componentes, tipos y persistencia comprobados localmente.

## Candidato y coordinación

Root autorizó ampliar application/progress.ts, infrastructure/progress-repository.ts y contrato grading.ts: `review` describe sólo estado e ID del último intento confirmado para docente; la proyección propia/AI lo elimina explícitamente. Nota efectiva publicada permanece independiente. `plan.units` cuenta temas dados desde units/topics, sin migración ni dependencia de actividades.

UI: cuatro estados de barras, cola con intento concreto, promedio de clase canónico, ausencia de denominador, camino por unidad, diálogo individual y retorno al destino de entrada. `onReview(activityId,attemptId)` y `onShowActivities` conectados por root. CSS dedicado después de parity-classroom-fidelity.css. Retirado el bloque adicional MyActivities por instrucción expresa del coordinador de igualar la maqueta; Actividades sigue accesible por CTA y resultados. Fuentes canónicas de progreso y oración afectada de guía grading actualizadas.

## Comprobaciones observadas

- RED: classroom-progress-exact 0/3; causas esperadas: porcentaje vacío inventado, falta estados de revisión y falta unidades.
- GREEN: classroom-progress-exact + parity-progress-fidelity + p8-progress-client + classroom-sections-redesign: 13/13 PASS, repetido tras retirar bloque extra. Incluye nota cero, reentrega con nota previa, metadatos docentes omitidos para self/AI, autorización negativa de miembro, navegación por IDs y retorno del diálogo.
- `tsc --noEmit --project apps/api/tsconfig.json`: PASS exit0.
- `tsc --noEmit --project apps/web/tsconfig.json`: PASS exit0, repetido tras ajuste final.
- Root autorizó adaptar sólo test de seguimiento de classroom-sections-redesign a Ver recorrido y componente TeacherOverview, conservando IDs reales; expectativas plan aditivas de p8-progress e integración actualizadas sin cambiar cálculos.
- Tras api:build PASS del coordinador, `node --test --test-concurrency=1 tests/classroom-progress-data.test.mjs tests/p8-progress.test.mjs`: suite P8 10/10 PASS; nueva prueba falló al intentar retirar actividad con entregas (CONFLICT conforme a regla existente). Se corrigió sólo fixture para retirar una actividad sin empezar de la misma unidad. `node --test tests/classroom-progress-data.test.mjs`: 1/1 PASS. Verifica SQL real de última revisión pending/saved/published, nota efectiva cero preservada, privacidad self, negativo estudiante/ajeno, plan con actividad retirada y lectura sin escrituras. Todas las bases descartables propias cerraron con cleanup exit0; sin datos retenidos.
- `git diff --check` en superficies editadas: PASS.

## Límites

No QA visual, build propio, reinicio, proveedores ni commits. El browser P8 histórico contiene selectores anteriores al rediseño; sólo se actualizó expectativa aditiva de plan, no se acredita su ejecución. Primer paso: recibir hallazgos de Ego del coordinador. Freeze confirmado después de evidencia focal y persistencia.

## Regresión de destino de devolución

Revisión independiente del coordinador encontró que Ver devolución abría la actividad/último intento y podía divergir de la nota mostrada frente a una reentrega privada. Nueva prueba RED comprobó callback incorrecto (actividad sin intento). `publishedAttemptId` ahora procede de `g.attempt_id`, con el mismo JOIN efectivo/publicado/autorizado que la nota; `onOpenResult(activityId,attemptId)` abre sólo ese resultado y no utiliza fallback al último intento. El coordinador conecta el destino `kind:grade` en shell.

GREEN focal classroom-progress-exact + parity-progress-fidelity + p8-progress-client: 9/9 PASS, con cero publicado. Fixture previo de fidelidad extendido con ID público real para conservar su prueba de apertura. Tipos API/web PASS. Tras api:build actualizado del coordinador, `node --test --test-concurrency=1 tests/classroom-progress-data.test.mjs tests/p8-progress.test.mjs`: 11/11 PASS exit0; PostgreSQL comprueba identidad pública nula antes de publicar, conservada después de reentrega privada y ausencia de ID del intento privado en self. Todas las bases descartables propias cerraron con cleanup exit0. Código backend/UI congelado nuevamente; navegación real del callback conectado por root pendiente de su QA.
