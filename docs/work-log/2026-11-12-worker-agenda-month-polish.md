# Agenda: corrección mensual acotada

- Agente: implementation writer delegado; identificador de sesión no expuesto.
- Fecha: 2026-11-12. Rama: main. Commit inicial: c702360a3502fdb47592416ee3c4c212d3f7277e. Worktree: ProtipoFoxMind.
- Árbol inicial: sólo registro del coordinador sin seguimiento; preservado sin cambios.
- Autorización: ajustar exclusivamente geometría mensual e indicador móvil de eventos. Sin navegador, servicios, build Next, datos, proveedores, dependencias ni operaciones Git terminales.
- Superficies previstas: agenda-ux.module.css, prueba mensual en tests, guías de Agenda/diseño y este registro. Sin cambios compartidos no-Agenda.
- Contexto leído: AGENTS, base documental, arquitectura, Agenda, política y registros; skill gentle-ui-design y referencias adaptive-interfaces/composition-and-feedback.
- Evidencia inicial: mediciones aportadas por coordinador (filas/celdas 86/92 px escritorio y 64/68 px móvil; indicadores ocultos). No observación visual propia.

## Plan y comprobaciones

Usar filas mensuales locales de 86 px (64 px hasta 600 px), celdas border-box que ocupen exactamente la fila e indicador decorativo existente hasta 800 px. Conservar nombres accesibles, selección y datos. Pruebas node:test en memoria y contratos estructurales CSS; no prueban layout renderizado. Sin runner CSS de navegador autorizado.

## Cambios y resultados observados

- `apps/web/src/features/agenda/ui/agenda-ux.module.css`: tamaño de fila local único, celda border-box al 100% con mínimo 0, indicador existente visible hasta 800 px. Sólo selectores del grid mensual bajo scope e id de Agenda; no cambia Semana/Día ni miniagenda compartida.
- `tests/agenda-month-polish.test.mjs`: dos contratos estructurales y una prueba de preservación mediante componente real con cuatro eventos sintéticos, día vacío, selección, 42 días, conteo completo y máximo tres puntos decorativos; entrada sin mutaciones.
- Guías de Agenda y diseño: describen el corte y distinguen las pruebas de la aceptación visual pendiente.
- No ODD S# suministrado para este corte; no se modifica seguimiento del coordinador.

### RED

`node --test tests/agenda-month-polish.test.mjs` (primera ejecución): exit 1, 0/3 pasan. Fallos esperados: `Missing Agenda-local rule: .agenda-grid` y ausencia de `@media (max-width: 800px)`. La prueba de preservación también falló por incluir el día real «hoy» en el nombre accesible. Se corrigió la expectativa para respetar aria-current, sin tocar producto ni eliminar el conteo exacto.

`node --test tests/agenda-month-polish.test.mjs` (segunda ejecución, antes del CSS): exit 1, 1 pasa / 2 fallan. Sólo fallan los dos contratos esperados anteriores; preservación pasa. Salida de node:test conservada en el intercambio del agente. No timeouts.

### GREEN y regresiones

`node --test tests/agenda-month-polish.test.mjs tests/agenda-polish-presentation.test.mjs tests/agenda-ux-navigation.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-view-modes.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-visual-polish.test.mjs`: exit 0; 23 pruebas pasan, 0 fallos/canceladas/omitidas (1898 ms). Incluye navegación/clamp de fin de mes/año bisiesto, selección y creación en fecha exacta, conteos/colores, vistas y formulario anteriores. Sin salida de error observada.

`git diff --check; git diff --stat; git diff -- apps/web/src/features/agenda/ui/agenda-ux.module.css docs/engineering/agenda/README.md docs/design/README.md; git status --short`: exit 0. Sin errores de whitespace; diff rastreado 11 inserciones/4 eliminaciones, más esta bitácora y prueba nuevas. Registro del coordinador preservado. Sin caches ni scratch nuevos.

## Límites y entrega

Implementado y comprobado estructuralmente/localmente; no integrado, publicado, desplegado ni aceptado visualmente. No build, typecheck o lint: sólo CSS, pruebas mjs y documentación; no cambios de tipos o dependencias. No navegador ni ejecución de servicios; build de la app en ejecución intacto. Los contratos de texto CSS no prueban el cascade completo, clipping, contraste ni layout renderizado. Ningún comportamiento compartido no-Agenda tocado; no requiere diferencial de comandos compartidos. Sin riesgos altos identificados dentro del alcance.

Primer paso del coordinador: revisión nativa/aceptación y, cuando autorice un build fuera de la inspección en curso, medir filas y celdas seleccionadas/no seleccionadas en escritorio y 320/390/600/768 px y comprobar puntos en días poblados. No se corrigieron los otros cuatro hallazgos. Sin commits ni memoria persistente.
