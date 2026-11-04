# Inventario de pruebas y sincronización de main

- Agent / role: root, coordinador e implementador.
- Session or task ID: unavailable.
- Date: 2026-11-04.
- Branch / worktree: codex/test-inventory-sync, checkout principal.
- Starting commit: 4d4e242730c8c35c3ae23b9ef9c9d3e9aeb7ad02.
- Phase and detailed task/spec links: R1; [verificación](../engineering/testing/README.md), [estado del producto](../implementation-roadmap.md).
- Status: completed.

## Request and scope

Tras la revisión de solo lectura, el usuario aprobó «Bien vamos con eso»: corregir el inventario, comprobarlo y sincronizar los siete commits locales de main con GitHub. Incluye los commits necesarios para esta corrección y su evidencia; sin despliegue, aplicación del stash ni cambios en otros worktrees o datos retenidos.

## Work performed

Se inspeccionaron Git, hoja de ruta, protocolo de registros y scripts de inventario/rutas. El checkout inicial está limpio, main contiene siete commits respecto de origin/main. `git fetch origin` confirmó 0 commits remotos exclusivos y 7 locales exclusivos. Se creó codex/test-inventory-sync desde 4d4e242. Los archivos nuevos agenda-visual-polish, home-by-role y home-warm-navigation tienen pruebas sintéticas sin servicios externos. Se incorporaron a entries y a la ruta fast, con seis líneas nuevas entre ambos manifiestos y sin modificar producto, pruebas o exclusiones. Se aplica work-unit-commits para conservar manifiestos y evidencia en una unidad coherente.

## Verification

- RED repetido antes de editar: `node scripts/run-complete-suite.mjs --check` termina con exit 1 y tres archivos Unclassified.
- GREEN: el mismo comando termina con exit 0, 446 entries, 53 explicit exclusions y 23 rutas. Se conservan todas las entradas y exclusiones previas; cada archivo nuevo pertenece a fast.
- `scripts/build-api.mjs`, invocado con spawnSync de Node y timeout 30000 ms: generación Prisma y compilación TypeScript exit 0. No se aplicaron migraciones ni se abrió una base de datos.
- Selección ejecutada mediante `runFastGroup` y `executeFastFile` de scripts/run-fast-suite.mjs, con `cleanEnvironment` de scripts/run-complete-suite.mjs y comprobación explícita de pertenencia a fast: agenda-visual-polish, home-by-role, home-warm-navigation, architecture-test-discovery, audit-ci-runner y audit-ci-execution. Resultado final tras el build fresco: 17 PASS, 0 FAIL, 0 SKIP, exit 0. Las fallas internas sintéticas de los tests del runner son escenarios negativos esperados y sus aserciones pasaron.
- Selección inicial de los tres nuevos archivos mediante el mismo ejecutor: 8 PASS, 0 FAIL, 0 SKIP. Antes de preparar el build fresco también pasaron los tres casos de audit-ci-runner/audit-ci-execution; el resultado final de 17 casos los vuelve a incluir.
- `npm run docs:check`: 138 archivos, 1733 enlaces, 0 issues. `git diff --check`: exit 0.
- Las 86 pruebas focales, TypeScript, lint y 138 archivos/1733 enlaces pasaron durante la revisión anterior sobre el mismo producto 4d4e242; no se presentan como una suite completa.
- No se repitieron toda la suite rápida, DB/servicios/navegador, proveedores reales ni QA visual: el cambio solo clasifica pruebas sintéticas ya existentes. La ejecución dirigida usa el runner real con build fresco y la validación comprueba cobertura y rutas globales. No se afirma un resultado de CI remoto.

## Commits and outcomes

- Corrección y evidencia: `a410355bfc709ea0e67b9011fe8bac0b56bf3923`, `fix(test): route new Home and Agenda checks in complete suite`.
- main avanzó de 4d4e242 a a410355 mediante `git merge --ff-only codex/test-inventory-sync`, sin conflictos ni cambios adicionales. Inventario/rutas se volvieron a comprobar en main: exit 0.
- `git push origin main`: exit 0, avance remoto a3afdc7..a410355. Publicados los siete commits previos más la corrección.
- Lectura posterior: `git rev-parse HEAD`, `git rev-parse origin/main` y `git ls-remote origin refs/heads/main` coinciden exactamente en a410355bfc709ea0e67b9011fe8bac0b56bf3923. `git status --short --branch`: main...origin/main, sin archivos pendientes.
- Stash previo `stash@{0}` fcef243 permanece con su etiqueta original. Los otros worktrees no se modificaron.
- Este cierre documental actualiza la hoja de ruta con la publicación ya observada. Su propio hash y su publicación se comprueban después de crearlo; no se anticipan aquí.

## Handoff

Inventario corregido e implementación publicada en main. No quedan tareas funcionales de esta unidad. Guardar/publicar este cierre documental y comprobar igualdad final local/remoto; el siguiente trabajo de producto requiere su propio alcance. La suite completa y CI remoto no se declaran aprobados. Reversión de la corrección: las tres entradas de cada manifiesto como unidad, conservando evidencia histórica. Sin despliegue ni cambios de datos.
