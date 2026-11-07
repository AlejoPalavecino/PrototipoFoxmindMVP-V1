# Crear aula — evidencia local de cuatro pasos

Cambio aprobado el 2026-11-07. [Tareas](../../../../odd/tasks/classroom-creation-four-steps.md), [coordinación](../../2026-11-07-root-classroom-creation-discovery.md), [revisión independiente](../../2026-11-07-root-classroom-creation-independent-review.md).

## Entorno y recorridos

Next production build aislado en `.test-artifacts/wizard-reference/apps/web`, puerto53195, servido únicamente en loopback. Ego Lite TaskSpace1, creado para esta entrega y cerrado con `finish({keep:[]})`. Componentes Wizard, ClassroomCollection y Plan reales; puertos de archivo/extracción/publicación deterministas en memoria. No se contactó Gemini, no se usaron cuentas ni datos retenidos. La comprobación SQL se ejecutó por separado en PostgreSQL efímero propio, con rollback/limpieza; no equivale a un E2E autenticado completo.

- Manual: editar unidad y tema, volver/revisar y confirmar sin POST de extracción ni publicación anticipada.
- IA: elección explícita, propuesta de dos unidades/cuatro temas, edición de unidad/tema, confirmación de reemplazo y aplicación; revisión→publicación→colección real→Plan real con los mismos nombres. Una publicación; propuesta jamás publica por sí sola.
- Archivo: seleccionar PDF sintético mediante input nativo, aprobación y portada General explícita preservada; subir no inicia IA.
- En cola: indicador móvil y continuación manual efectiva sin perder contenido.
- Error de creación: revisión conservada, mensaje y reintento por teclado que vuelve a colección.
- Creación pendiente: botón deshabilitado y spinner; `prefers-reduced-motion: reduce` da `animation-name:none` sin ocultar el texto de estado; finaliza en colección.
- Teclado: cambio de paso enfoca encabezado, Enter en botones avanza/confirma, sin publicación al editar/revisar.

## Responsive y capturas

Los cuatro pasos se capturaron en320/390/768/1440×900 y pasaron comprobación de `documentElement.scrollWidth` y `dialog.scrollWidth` frente al ancho disponible. Las capturas `final-datos-*`, `final-eleccion-*`, `final-unidades-*` y `final-revision-*` documentan esos estados; `review-geometry.json` conserva la medición final de revisión. Capturas `review-*` previas son historia del primer recorrido manual. No se afirma que contenido largo quepa sin desplazamiento vertical.

La inspección detectó botón Quitar fragmentado a320px; CSS corregido a mínimo64px/sin salto, geometría repetida y evidencia `final-unidades-320-fixed.png`. El resumen móvil recibió después un ajuste CSS de descripción en una sola columna, comprobado por build y revisión de la regla; las capturas previas de revisión conservan la disposición anterior en dos columnas. No atribuirles visualización de ese último ajuste.

`ai-review.png`, `created-plan.png`, `ai-loading-mobile.png`, `creation-error.png`, `creation-busy-reduced-motion.png` y `final-review-upload.png` documentan estados y recorridos específicos. Se conservan imágenes previas, sin hacerlas pasar por el candidato visual posterior.

## Incidencias y límites

El helper aislado inicial no enlazaba `apps/web/src`, requerido por `_app`; primer build falló. Se corrigió el helper y los builds siguientes pasaron. Ego rechazó una búsqueda exacta de radio cuyo nombre incluye descripción y un snapshot subtree con root no-ref; se corrigieron selectores/observación sin cambios de producto. Hubo timeouts del autoscroll de Ego al intentar alcanzar botones dentro del diálogo largo; estado observado, foco/Enter completaron los recorridos. No se usa ese fallo de automatización como PASS del intento inicial.

No prueba real de extracción, piloto, despliegue, ni pasada global de todas las suites. La paridad persistente de nombres/orden se acredita con prueba SQL independiente y la renderización del Plan con datos de la fixture; los dos alcances permanecen diferenciados.
