# Revisión ordinaria de los últimos cambios — Astra

- Actor de revisión: `/root/astra_project_audit`, modelo Astra y esfuerzo alto, conforme al pedido inicial del usuario.
- Registro persistido por: coordinador `/root`; el revisor no escribió archivos ni implementó las correcciones.
- Fecha: 2026-10-30, America/Buenos_Aires.
- Rama y base: `codex/audit-remediation`, `446d3cb79cb122fb43f50dbf88abd40dcd61dd5e`.
- Tarea: deltas finales de [la remediación](../../odd/tasks/audit-remediation.md), después de las revisiones anteriores. No constituye otra ronda Judgment Day ni reinicia su presupuesto cerrado.
- Estado de revisión de fuente: completed. La aceptación funcional global sigue pendiente del coordinador.

## Alcance y primer resultado

Inspección de los tres archivos de arranque, fixture outbox y últimas adaptaciones de entry, P5 y P9; comprobación de los SHA de los dos archivos de navegación restringida frente al dictamen previo. Snapshot de 13 paths a `2026-10-30T14:09:36.468Z`; digest del JSON ordenado `{path,sha256}`: `2b8b4417bd206d430f669204f0836c5c3e7809e18beefeba3d53a2f7a4e4cc7c`.

El revisor informó parser TypeScript de 13 archivos sin diagnósticos y diff-check acotado con exit 0. Sin hallazgos nuevos en arranque, fencing de outbox, entry, P5 y Plan. Conservó expresamente como no demostrada la causa de los timeouts históricos; no convirtió la estabilización de las fixtures en una explicación retrospectiva.

Hallazgo MEDIA: `tests/p9-home-integration.test.mjs:291` intentaba reintentar Inicio detrás del diálogo modal de notificaciones. Era un caso equivalente al corregido en el archivo de recuperación, pero seguía pendiente en este entrypoint. El revisor no ejecutó el recorrido ni atribuyó el defecto al último cambio de selectores.

## Corrección y revisión del delta

Test runner corrigió el caso: observar el error, cerrar el modal, recuperar Inicio con HTTP 200 sin consultar notificaciones y retirar el listener en `finally`; después reabrir notificaciones con una respuesta 200 propia y el aviso esperado. Se conserva la actualización explícita.

El suplemento también revisó el encabezado de registro P3: solo cambia a «Creá tu cuenta», con coincidencia exacta y rol de heading. Los contratos de contraseña, recuperación y sesión permanecen.

Dictamen: **LGTM_SIN_HALLAZGOS**, snapshot `2026-10-30T14:13:49.529Z`, digest conjunto `58bc2a1887f709918f1c8019510eb0f60e472b3dcbd5ddd8b096f16bf18c47a8`:

| Archivo | SHA256 |
|---|---|
| `tests/p3-browser.test.mjs` | `93b552d697147b1f1c7623d16203302a0b840517c81ee8aa79acecd5997d2901` |
| `tests/p9-home-integration.test.mjs` | `55beb17964370ee9c199e9727b6be8efb8d868c8c71369bc418e4cdde1acd5c8` |

El revisor informó parser de ambos archivos sin diagnósticos, diff-check exit 0, cuatro SHA históricos protegidos exactos y ningún cambio posterior en los tres archivos de arranque.

## Límites y entrega

Sin escrituras de producto, pruebas funcionales, DB, navegador, configuración privada, Engram, commit ni publicación por el revisor. Esta aprobación de fuente no acredita que la suite completa pase. Las ejecuciones y los candidatos rechazados se conservan en [el registro del coordinador](2026-10-30-root-audit-completion.md) y en los registros de verificación.

Siguiente acción: terminar las ejecuciones completas sobre los candidatos actuales; corregir cualquier fallo real sin relajar contratos ni tiempos; cerrar documentación y commits locales solo con evidencia aplicable.

## Suplemento: representación canónica de cursores

Dictamen ordinario **LGTM_SIN_HALLAZGOS**, snapshot `2026-10-30T14:32:37.925Z`. Siete paths: los tres archivos de cursores, la nueva regresión pura, P5 y los dos manifiestos de suite. Digest ordenado: `f50948e52dd79db30f6d84790a3a5508355708553ccb3272d99b84bbe9b53f44`.

El revisor confirmó el rechazo de cuerpos y firmas Base64URL no canónicos antes de la comparación constante del MAC, los límites originales y la compatibilidad de namespaces y tokens válidos. Las comprobaciones de aula/hilo y actor/filtro permanecen en sus consumidores. La vulnerabilidad observada es maleabilidad de representación; no se demostró un bypass de payload o permisos.

También revisó que P5 exige una única opción geográficamente equivalente a Buenos Aires según el navegador y conserva exactamente el valor elegido en recarga y publicación. No se fuerza un alias particular que el catálogo deduplica.

Checks informados: cinco fuentes parseadas sin diagnósticos, diff-check acotado exit 0 e inventario de 304 únicos / 51 exclusiones / 23 rutas / FAST180, con la nueva regresión una sola vez. Sin escrituras, DB, navegador, ejecución funcional ni Engram por Astra. La aceptación completa permanece pendiente de las ejecuciones del coordinador y verificador.
