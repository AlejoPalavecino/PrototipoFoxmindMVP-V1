# Integración y publicación de la migración por dominios

## Contexto y autorización

- Coordinador: `/root`; identidad de sesión del runtime no expuesta. Fecha: 2026-11-10.
- Rama inicial: `codex/architecture-foundation`; candidato: `53d6fc5ede1eb1a37bd2c40b0d7921fc97e86c72`. Árbol limpio observado.
- El usuario autorizó integrar los cambios a main, hacer push y conservar main como única rama, con verificaciones. No autoriza despliegue, cambios funcionales adicionales ni datos/proveedores reales.
- Registro abierto antes de modificar Git o documentación. No se invocan escrituras de memoria sin identidad registrada.

## Reconciliación inicial

`git fetch origin --prune` pasó. Main local y remoto coinciden en `aebc603fb501230870c2b5cc7a4e5b2e5a08cc3e`. El candidato está 17 commits adelante, sin divergencia. Se comprobó que main, origin/main, codex/local-stop-docker y su remoto son ancestros del candidato; codex/local-stop-integration apunta al mismo commit que main. Ninguna rama requiere descartar commits. Hay un único worktree, el actual.

Ramas locales iniciales: main, codex/architecture-foundation, codex/local-stop-docker y codex/local-stop-integration. Ramas remotas observadas con ls-remote: main y codex/local-stop-docker. Se integrará por fast-forward, sin reescribir historial ni forzar push. Sólo se eliminarán referencias ya integradas, comprobando sus hashes.

## Verificación y límites

La aceptación del código está en el [recibo de migración](../verification/architecture-migration.json): 336 archivos rápidos/1918 PASS, DB 131/847, servicios 9/52, navegador 44/174 y wrappers 19 rutas/153 PASS, con cohortes explícitas. Builds, tipos, lint y QA ya verificados; no se presentarán como nuevas ejecuciones de publicación.

Para esta entrega se comprobarán igualdad de árbol al avanzar main, fronteras, inventario, contratos de CI, regresión HTTP y documentación/TTP. Si sólo cambia prosa/metadata, no se repiten suites DB ni navegador. El workflow vigente se dispara por pull_request: un push directo a main no constituye una nueva ejecución de CI remoto y no se cambiará ese trigger como parte de esta publicación.

## Estado y siguiente paso

Main avanzó por `git merge --ff-only codex/architecture-foundation` hasta `53d6fc5ede1eb1a37bd2c40b0d7921fc97e86c72`. Árbol integrado idéntico al candidato: `8a523884a692b7cfa920d056e0406b175ad286b5`. No hubo conflictos ni cambios de producción: diff de apps/src/prisma/scripts/tests/workflows/manifiestos contra el candidato vacío.

Checks nuevos sobre main: 72 pruebas PASS, cero fallos/omisiones/cancelaciones (workflow, documentación, discovery, regresión HTTP y guard de fronteras); lint/AST con cero excepciones; inventario 530 entradas/53 exclusiones/23 rutas; TTP 28 tareas válidas; documentación 102 archivos/919 enlaces sin problemas. Logs propios en .test-artifacts/architecture-finish/publication-*.log. Las suites DB/browser anteriores conservan su evidencia y no se repitieron por esta integración de árbol idéntico.

Registro de integración versionado en `bf8998f3f671b03b45fe62a14fd83d13dbe4af0d`. Push atómico exitoso: main avanzó desde aebc603 hasta bf8998f y se retiró la referencia remota codex/local-stop-docker. El lease se aplicó sólo al hash comprobado de esa referencia; main no se forzó ni se reescribió. Log: .test-artifacts/architecture-finish/publication-first-push.log.

Después del push se comprobó con ls-remote que el único head remoto era main en bf8998f. Fetch/prune pasó y las tres ramas locales integradas se eliminaron mediante branch -d: codex/architecture-foundation, codex/local-stop-docker y codex/local-stop-integration. Branch -a muestra sólo main y origin/main más el alias simbólico origin/HEAD. El HEAD predeterminado remoto apunta a main y su hash coincide con main/origin/main. Ninguna rama con commits exclusivos fue descartada.

Este resultado actualiza recibo, roadmap y tablero en un último commit exclusivamente documental. Después de publicarlo se vuelven a comprobar HEAD, origin/main y ls-remote, conjunto de ramas, ancestros conservados y árbol limpio. Su hash no se inventa dentro del propio recibo: la comprobación efectiva queda en .test-artifacts/architecture-finish/publication-final-git-check.log y en la respuesta de entrega. No se efectuó despliegue ni se declara CI remoto nuevo; el workflow continúa limitado a pull_request.

Revalidación del recibo antes de su commit: documentación 102 archivos/919 enlaces sin problemas, 19 pruebas documentales/discovery PASS sin fallos/omisiones/cancelaciones, TTP 28 tareas válidas y diff --check limpio. Los 72 tests de integración de entrega ya pasaron sobre main; esta última edición sólo modifica prosa y metadata de publicación.
