# Unidades locales de la remediación

Coordinador: `/root`; rama `codex/audit-remediation`, worktree aislado. Alcance: los seis puntos autorizados; sin publicación ni despliegue. Este registro acompaña las unidades locales; los resultados e intentos históricos permanecen en el registro de cierre.

## A — Contratos puros compartidos

Formatos y validaciones comunes de Muro, notificaciones y calificaciones, con cinco casos puros de rechazo y precisión numérica. El caso adicional de comparación con proxy acompaña a sus consumidores en la unidad C. No se relajan campos, confirmaciones, límites ni valores cero/null. Los cinco casos están incluidos en FAST181 aprobado (783/0/5). Runtime N/A para esta unidad pura; consumidores HTTP verificados en C. Rollback: revertir los ocho archivos de contrato y sus cinco casos antes de aplicar C. Commit observado `69b1f17`:10 archivos,357 inserciones. Gitleaks del índice y diff-check pasaron antes del commit, sin hallazgos.

## B — Arranque con validación previa a módulos pesados

Configuración pura conservada y validada antes de importar la aplicación; mismos errores, reglas y precedencia. Dos casos de arranque incluidos en FAST181 aprobado; ocho rechazos reales de configuración inválida bajo el límite original1500ms. Runtime adicional comprobado con los builds e inicios de las suites completas. Rollback: configuración-base/configuración/main y los dos casos seleccionados, antes de aplicar C. Commit pendiente; índice con secretos y blancos se comprobará antes de guardarlo.

## Evidencia común y política de entrega

DoD funcional aprobado por reviewer independiente tras FAST181783/0/5 y navegador41completo169/0/0 sobre código4aeae017, más DB394/0/0, servicios50/0/0 y wrappers152/0/0 con entradas reconciliadas. Fuentes y dependencias verificadas, recursos propios limpios. Ver [registro coordinador](2026-10-30-root-audit-completion.md) y [revisión](2026-10-30-remediation-delivery-review.md). Los resultados omitidos/excluidos y los intentos fallidos permanecen explícitos.

Se conservará evidencia de cada escaneo de secretos del índice antes de su commit. Las unidades C y D exceden400 líneas porque las capacidades/fachada/consumidores y el lock/inventario forman cambios acoplados; el exceso fue revisado y declarado, sin separar pruebas del comportamiento ni comprimir código. La unidad E consolida registros atribuidos y estados finales. Entrega exclusivamente local; no push, PR ni despliegue.
