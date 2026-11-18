# Esquemas, resúmenes y repasos en Mi Estudio

Agente /root/estudio. Rama feature/latencia-ia, base 6e9c1312, árbol con cambios concurrentes. El coordinador encargó el corte pendiente de Mi Estudio en la etapa 3 autorizada: esquemas y resúmenes basados en fuentes, extracción fiel del programa y consignas para repaso espaciado según la Agenda personal existente.

Se usarán pruebas del motor, planes de estudio, presentación y persistencia con infraestructura sintética. El versionado del perfil activo queda a cargo del coordinador.

## Comportamiento

- El esquema editable nombra las relaciones con verbos y distingue una secuencia del programa de una dependencia entre conceptos.
- El resumen conserva unidades, condiciones, hechos e interpretaciones de las fuentes. Las expresiones matemáticas se piden en texto simple. El análisis de programa conserva las unidades, agrupaciones y orden que el documento aporta.
- Organizar mi repaso deriva consignas de recuperación y transferencia a partir de las fechas locales y los temas del plan. Una sesión repetida el mismo día sugiere espaciarla. Se puede editar la consigna o vaciarla para volver a la propuesta. La revisión antes de confirmar Agenda muestra la actividad. El evento privado conserva esa descripción y sus reglas de confirmación, recordatorios y permisos.
- El campo opcional de actividad pertenece al JSON de sesiones de Estudio. Las sesiones anteriores reciben una sugerencia calculada sin migración de datos.

## Evidencia

- RED en el motor por falta de la política de esquema, resumen y extracción de programa. RED en la planificación y Agenda por ausencia de consignas, pérdida de la edición y omisión en el evento. La prueba de presentación también falló por falta de la consigna.
- GREEN dirigido 68/68: `node --experimental-transform-types --experimental-test-module-mocks --test tests/ai-generation-snapshots.test.mjs tests/study-ai-execution.test.mjs tests/frontend-study-step-views.test.mjs apps/api/src/modules/study/generation/application/engine.test.ts apps/api/src/modules/study/reviews/infrastructure/tests/exact-review-plan.test.ts apps/api/src/modules/study/reviews/infrastructure/tests/session-event.test.mjs`.
- GREEN frontend 15/15: `node --test tests/frontend-study-step-views.test.mjs tests/study-exact-repaso.test.mjs tests/study-ui-audit-regressions.test.mjs`. Se corrigió una ruta de importación detectada en la primera iteración y se repitió la suite.
- GREEN PostgreSQL descartable 1/1 con API compilada: `node --experimental-transform-types --test --test-name-pattern 'recordatorios idempotentes' apps/api/src/modules/study/folders/infrastructure/tests/integrations.test.mjs`. Dos confirmaciones distintas de una sesión devuelven el mismo evento y revisión. La base guarda una fila con su actividad, y el otro estudiante sigue sin acceso a los avisos.
- ESLint focalizado, documentación y `git diff --check` pasaron.

Quedan en manos del coordinador los recorridos de navegador y la revisión de salidas del proveedor de la app local. La prueba de Agenda fue determinista y no requirió IA. Estado local.

## Ajustes tras la prueba del coordinador en Ego Lite

El esquema real incluía «Estado de evidencia» aunque el pedido era relacionar conceptos de un PDF válido. Se reprodujo la causa en el motor. El contexto agregaba evidencia de prácticas y pedía informar su ausencia para todas las operaciones. El perfil V5 excluye ese contexto en apunte, esquema y análisis de programa. El resumen y el esquema se dirigen al estudiante. El esquema pide una frase por vínculo. CHAT conserva ayuda contextual y sólo menciona desempeño ante una consulta explícita. Las prácticas conservan la evidencia para elegir foco. El apunte y el esquema tampoco invalidan su snapshot si cambian resultados de prácticas mientras se preparan.

El formulario de repaso podía sugerir hoy a las 17:00 después de que esa hora había pasado. Ahora propone el día siguiente y, si se edita el inicio a un momento pasado, indica cómo elegir otra fecha u hora. El cálculo usa la zona local y se prueba con una hora fija.

RED tres fallos esperados, GREEN 40/40 en `node --test apps/api/src/modules/study/generation/application/engine.test.ts apps/api/src/modules/study/generation/application/tests/generation-protocol.test.mjs tests/study-exact-repaso.test.mjs`.

La regresión ampliada con perfiles de ejecución, adaptador, presentación y Agenda pasó 83/83. ESLint focalizado, 211 archivos y 1136 enlaces en el control de documentación, y diff check también pasaron.
