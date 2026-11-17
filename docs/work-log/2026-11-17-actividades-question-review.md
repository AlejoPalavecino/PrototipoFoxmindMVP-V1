# Validación de preguntas antes de revisión

- Agente: `/root/actividades`, implementación delegada por coordinador; fecha 2026-11-17.
- Base: coordinador comprobó `main`, `c470312`, limpio al comenzar. Git no es accesible desde esta sesión (`not a git repository`); no se atribuye comprobación propia.
- Autorización: corregir validación y mensajes del editor, pruebas RED/GREEN, sin publicación. Preservar cambios concurrentes.
- Superficies: reglas de borrador, navegación del editor, pruebas focalizadas y este registro.
- Aceptación: impedir revisión de preguntas que backend rechazaría; indicar número y problema, abrir Preguntas y seleccionar la primera inválida; conservar contratos backend.
- Estado: implementación y verificación focalizada completas; pendiente reconciliación del coordinador.
- Límites: datos sintéticos; sin proveedor real ni cambios de contratos backend.

## Cambios y evidencia

- `draft-rules.ts` valida cada pregunta antes de revisión: consigna y opciones con límites/control de caracteres, puntos positivos decimales, opciones/claves y reglas según tipo. Informa número y causa; el editor selecciona esa pregunta y abre la sección Preguntas.
- Prueba nueva `tests/activity-question-review.test.mjs`: 15 formas inválidas contrastadas con `authoringQuestion` backend, tres formas válidas, bloqueo UI y avance a revisión luego de corregir sin escrituras.
- RED: `node --experimental-transform-types --test tests/activity-question-review.test.mjs`, exit 1, 0/2; falló porque regla devolvía null y UI avanzaba al paso 2.
- GREEN: mismo comando, exit 0, 2/2.
- Regresión: `node --experimental-transform-types --test tests/activity-question-review.test.mjs tests/frontend-authoring-cases.test.mjs tests/activity-ai-ui.test.mjs tests/parity-authoring-entry.test.mjs tests/product-parity-activity-ui.test.mjs tests/classroom-activity-workflow.test.mjs tests/brujula-authoring-complete.test.mjs`, exit 0, 52/52.
- ESLint focalizado sobre ambos archivos de producción, exit 0.
- Prueba registrada en `scripts/ci-suites.mjs`, `scripts/complete-suite-inventory.json` y ruta fast de `scripts/complete-suite-routes.json`. `node scripts/run-ci-suite.mjs --check` y `node scripts/run-complete-suite.mjs --check`: exit 0; 686 entradas, 57 exclusiones explícitas y 23 rutas en el estado concurrente observado.
- Coordinador autorizó actualizar la expectativa antigua de `frontend-authoring-cases.test.mjs` que aceptaba una pregunta inválida; se conservaron assertions de serialización y se agregó avance UI con preguntas válidas.
- No commits, push, PR, merge ni despliegue. Sin QA visual de navegador para este cambio; cobertura UI mediante harness React sintético. Primer paso pendiente: controles integrales y revisión del coordinador.
