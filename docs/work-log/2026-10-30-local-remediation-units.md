# Unidades locales de la remediación

Coordinador: `/root`; rama `codex/audit-remediation`, worktree aislado. Alcance: los seis puntos autorizados; sin publicación ni despliegue. Este registro acompaña las unidades locales; los resultados e intentos históricos permanecen en el registro de cierre.

## A — Contratos puros compartidos

Formatos y validaciones comunes de Muro, notificaciones y calificaciones, con cinco casos puros de rechazo y precisión numérica. El caso adicional de comparación con proxy acompaña a sus consumidores en la unidad C. No se relajan campos, confirmaciones, límites ni valores cero/null. Los cinco casos están incluidos en FAST181 aprobado (783/0/5). Runtime N/A para esta unidad pura; consumidores HTTP verificados en C. Rollback: revertir los ocho archivos de contrato y sus cinco casos antes de aplicar C. Commit observado `69b1f17`:10 archivos,357 inserciones. Gitleaks del índice y diff-check pasaron antes del commit, sin hallazgos.

## B — Arranque con validación previa a módulos pesados

Configuración pura conservada y validada antes de importar la aplicación; mismos errores, reglas y precedencia. Dos casos de arranque incluidos en FAST181 aprobado; ocho rechazos reales de configuración inválida bajo el límite original1500ms. Runtime adicional comprobado con los builds e inicios de las suites completas. Rollback: configuración-base/configuración/main y los dos casos seleccionados, antes de aplicar C. Commit pendiente; índice con secretos y blancos se comprobará antes de guardarlo.

## Evidencia común y política de entrega

DoD funcional aprobado por reviewer independiente tras FAST181783/0/5 y navegador41completo169/0/0 sobre código4aeae017, más DB394/0/0, servicios50/0/0 y wrappers152/0/0 con entradas reconciliadas. Fuentes y dependencias verificadas, recursos propios limpios. Ver [registro coordinador](2026-10-30-root-audit-completion.md) y [revisión](2026-10-30-remediation-delivery-review.md). Los resultados omitidos/excluidos y los intentos fallidos permanecen explícitos.

Se conservará evidencia de cada escaneo de secretos del índice antes de su commit. Las unidades C y D exceden400 líneas porque las capacidades/fachada/consumidores y el lock/inventario forman cambios acoplados; el exceso fue revisado y declarado, sin separar pruebas del comportamiento ni comprimir código. La unidad E consolida registros atribuidos y estados finales. Entrega exclusivamente local; no push, PR ni despliegue.

## C — Aulas acotadas, composición, aislamiento y diagnóstico

Commit B observado `6fbef4a`:5 archivos,78 inserciones y21 eliminaciones; Gitleaks y diff-check del índice pasaron, sin hallazgos. C reúne las capacidades/contexto/fachada, contratos HTTP y sus consumidores, Muro/notificaciones acotados, estados independientes, locks/progreso/scheduler/diagnóstico y las regresiones correspondientes. Se incluyen los casos completos de paridad y composición que amplían las pruebas puras de A/B; los archivos de prueba del working tree no se alteraron al seleccionar los hunks del índice.

Pruebas ejecutadas: `npm run test:complete -- --group fast`783/0/5; `--group owned-browser`169/0/0 en41 archivos; DB394/0/0, servicios50/0/0 y wrappers152/0/0 con entradas reconciliadas. Builds reales, tipos/fronteras y revisión independiente aprobados. Runtime: navegador→proxy→API→DB/servicios efímeros, sin proveedor real. Rollback: revertir C como unidad acoplada y sus tests; A/B pueden mantenerse. Exceso de400 líneas declarado y revisado: separar16 capacidades/fachada/lectores/consumidores produciría estados intermedios incompatibles. Commit pendiente; controles de secretos/blancos del índice se ejecutarán antes de guardarlo.

## D — Inventario completo, fronteras y dependencias fijadas

Commit C observado `f520765`:156 archivos,4650 inserciones y1999 eliminaciones; Gitleaks del índice (~323KB) y diff-check pasaron, sin hallazgos. D activa las cinco agrupaciones de la suite con305archivos admitidos únicos/51exclusiones justificadas/23rutas, fronteras AST/ESLint, control de secretos independiente y dependencias bloqueadas actualizadas. Incluye las regresiones del runner y la estabilización acotada del fixture de outbox, sin cambiar sus26s ni la lógica de producto.

Verificación: FAST783/0/5, navegador169/0/0, DB394/0/0, servicios50/0/0 y wrappers152/0/0; inventario/argv exactos. Tipos y fronteras exit0; `npm audit --package-lock-only --ignore-scripts --json --no-fund` exit0, cero vulnerabilidades. Runtime cubierto por las suites completas y sus procesos efímeros; no se ejecutó CI remoto. Rollback: revertir D conserva producto C, pero retira la ampliación del inventario/controles/lock; la entrega completa requiere ambas unidades. Exceso de400 líneas por lock/manifiestos y harnesses completos, declarado y revisado sin compresión. Commit pendiente de escaneo y guardado.
