# ARQ-04 — controles de arquitectura

- Agent / role: /root, coordinación e implementación.
- Session or task ID: no disponible en el runtime.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-04](../../odd/tasks/architecture-consolidation.md#arq-04--fortalecer-controles-de-arquitectura), [diseño aprobado](../../odd/tasks/architecture-consolidation-arq03-design.md).
- Status: completed.

## Request and scope

«Vamos con la ARQ-04». Fortalecer el control estático y congelar excepciones concretas sobre el diseño aprobado. La extracción de Files corresponde a ARQ-05.

## Work performed

Reconciliados main, HEAD y 42 entradas iniciales de Git con los cierres de ARQ-02/03. Se preserva el trabajo previo. Alcance de escritura en scripts del guard, pruebas focales y documentación de continuidad.

Actualizados `scripts/check-boundaries.mjs`, `scripts/boundary-legacy-edges.mjs` y `tests/audit-boundaries-guard.test.mjs`. Agregado `scripts/boundary-cycles.mjs`. Se conservó el comando de CI `lint:boundaries`. El guard distingue imports, reexportaciones, tipos inline, import-equals, `import()` y cargas CommonJS reconocidas. Cubre helpers TS de toda la app web, normaliza separadores de Windows y extensiones de módulo, y controla los barrels amplios y el cableado de host. Las excepciones de consumo quedan ligadas a origen, destino, forma, modo y binding inspeccionado. El modo CLI rechaza excepciones que ya no corresponden al árbol actual.

La línea base tiene 336 entradas exactas. Incluye 53 usos de barrels amplios, 31 APIs privadas y 22 entradas de superficie pública. Las otras 230 son aristas en rutas cíclicas, con 10 eager, 216 mixtas y 4 exclusivamente de tipos. Son aristas por clase, no recuentos de ciclos únicos. Se retiraron 6 de las 37 excepciones antiguas por quedar obsoletas. Las nuevas entradas registran motivo, responsable lógico, condición de retirada y verificación.

El análisis es sintáctico y se aplica al código TS de los directorios controlados. Las clases eager/deferred/type-only/mixed describen rutas de dependencias. La ejecución real, los alias y flujos indirectos arbitrarios, y los accesos SQL o a miembros de objetos en general quedan fuera de esta comprobación. El cambio mantiene la implementación académica y de Files existente.

## Verification

- RED inicial con `node --test tests/audit-boundaries-guard.test.mjs`: 5 pasan y 4 fallan por los huecos esperados. La revisión reprodujo variantes adicionales. Sus fixtures provocaron RED antes de la corrección y pasaron en el candidato final.
- `node --test tests/audit-architecture.test.mjs tests/audit-boundaries-guard.test.mjs tests/domain-barrel.test.mjs`: exit 0, 18/18, cero fallas u omisiones.
- `node scripts/check-boundaries.mjs` y `npm run lint:boundaries`: exit 0, 336 entradas, cero desvíos y cero entradas obsoletas.
- [Revisión independiente](2026-11-02-arq04_review-independent.md): VERIFIED para el guard estático. Se comprobaron los cuatro SHA-256 revisados contra el candidato, 4/4. Nueve fixtures independientes y cuatro casos de ciclos en memoria pasaron.
- Manifiesto local ARQ-02: 21/21 huellas coincidentes. Se comprobaron también los metadatos de las 336 entradas.
- Control de enlaces focal: 4 documentos, 266 enlaces y cero problemas. `npm run docs:check`: exit 0, 138 documentos y 1697 enlaces sin problemas. `git diff --check`: exit 0 con avisos LF/CRLF. HEAD final coincide con el inicial.
- Las pruebas y el lint focalizados cubren el cambio de tooling. Pruebas de producto, builds, servicios y ejecución con datos quedan fuera de esta verificación.

## Commits and outcomes

ARQ-04 completada localmente sobre main/add38ec. Plan y roadmap actualizados. La tarea modificó herramientas, pruebas focales y documentación. Sin cambios de producto, datos, commits ni publicación.

## Handoff

Siguiente unidad: ARQ-05, pendiente de asignación explícita. Al asignarla, partir del contrato de adjuntos aprobado y usar el guard para comprobar la retirada de las aristas del bridge que dejen de existir.
