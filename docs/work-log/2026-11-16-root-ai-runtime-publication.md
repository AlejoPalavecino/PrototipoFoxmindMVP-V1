# Integración y publicación de la arquitectura IA

## Autorización y candidato

- Coordinador `/root`; sin identidad de sesión registrada para memoria. Fecha: 2026-11-16.
- El usuario autorizó comenzar el envío a main, crear commits, hacer push e integrar según corresponda. Esta autorización continúa el trabajo IA aprobado; no incorpora los cambios de diseño/UX abiertos en otros worktrees ni concede despliegue o migración sobre datos retenidos.
- Worktree de origen: `C:/Users/alejo/.codex/worktrees/foxmind-ai-runtime/ProtipoFoxMind`, rama `codex/foxmind-ai-runtime`, base `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`.
- `git fetch origin` confirmó main y origin/main en esa base, sin divergencia. Main conserva nueve bajas de diseño y tres documentos sin seguimiento, ajenos a esta entrega; se integrará sin stash ni incluirlos en los commits.
- [Especificación](../engineering/ai/runtime-proposal.md), [tarea](../../odd/tasks/ai-runtime.md) y [evidencia de implementación](2026-11-16-root-ai-runtime-design.md).

## Unidades de commit y verificación

1. `e5fe889`: contrato/ejecutor común y transportes SDK oficiales. Repetición focal 21/21. El rollback de esta unidad retira los módulos técnicos nuevos, su contrato, dependencia Anthropic y tests/manifiestos asociados; todavía no activa rutas de aplicación.
2. `1b768f9`: persistencia y política SQL: perfiles inmutables, lector, presupuesto y migración aditiva; inicialización en producción aún sin conectar en esta unidad. Repetición focal 19/19 con PostgreSQL descartable: snapshots, upgrade, caminos negativos, tarifas y ambas órdenes de concurrencia. El rollback funcional exige retirar también los consumidores posteriores; una migración ya aplicada no se revierte borrando SQL ni datos. Esta publicación no la aplica a datos retenidos.
3. `e9d901d`: integración de los seis flujos, selección neutral por trabajo, preflight Foxy, composición, documentación y aceptación de dominios. La activación de la política debe viajar con todos los productores/workers para evitar admitir trabajos sin snapshot. Por eso se conserva ese cambio coordinado en una unidad mayor que el objetivo de 400 líneas. Los primeros dos commits también exceden ese objetivo para mantener contratos/serializadores o SQL junto a su aceptación; el lockfile se identifica como generado. No se achicó código ni cobertura para cumplir una cifra.

El candidato completo ya pasó build Prisma/TypeScript, lint de límites sin excepciones, pure408/408 y Study77/77. Evidencia adicional y fallos intermedios permanecen en el registro de implementación: policy/inventario14/14, bridge/clientes37/37, Study SQL4/4, regresiones de dominios92 aprobadas con un fallo de preparación SQL y posterior PDF aislado6/6. Revisión independiente VERIFIED sobre rutas críticas, sin bloqueantes. Las comprobaciones se superponen y no se suman como cobertura única.

Repetición final de las nueve suites de integración propias:80/80, con SDK sintético y PostgreSQL descartable. Antes de integrar pasaron diff, inventario/rutas (564 entradas,53 exclusiones,23 rutas), documentación (150 archivos,899 enlaces,0 incidencias) y tablero (9 tareas válidas). El staging coincide con los archivos verificados. Los ensayos de proveedores son sintéticos; no se leen claves ni se realizan llamadas pagas. La suite completa de repositorio no se declara ejecutada.

## Estado de publicación

Los tres commits se integraron en main mediante fast-forward, sin conflictos. El primer push terminó exitosamente: `ef6828b..e9d901d main -> main`. `git ls-remote --heads origin main`, main y origin/main coincidieron en `e9d901d1fd4197f967c73f477ec30098541e4465`.

Se confirmó que los 12 cambios locales ajenos conservan estado y bytes; no se usó stash, reset ni limpieza de worktrees. El worktree IA quedó limpio después del commit de integración. No se publicaron ni eliminaron otras ramas.

Este último recibo actualiza sólo documentación de estado y autorización. Su hash no se inventa dentro del propio contenido: tras commitearlo e incorporarlo por fast-forward, se vuelve a hacer push y se verifica main, origin/main y ls-remote. La comprobación exacta queda en `.test-artifacts/ai-runtime/publication-final.json` y en la respuesta de entrega. La compilación y las pruebas se atribuyen al candidato de código sin modificaciones posteriores; no se reinstalan dependencias ni se reinician servicios del workspace principal para publicar Git.

No hubo despliegue, arranque sobre datos retenidos ni activación real de Claude. La suite remota/CI no se declara ejecutada ni aprobada. Antes de actualizar un entorno con datos retenidos sigue siendo necesario el drenaje documentado; mergear SQL a Git no aplica la migración.

Validación del recibo final antes de su commit: documentación150 archivos/902 enlaces sin incidencias, tablero9 tareas válidas y diff check correcto. Sólo cambiaron seis archivos de instrucciones/documentación de estado; el código verificado no cambió.
