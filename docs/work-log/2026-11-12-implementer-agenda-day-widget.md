# Agenda: widget diario aprobado05

- Agente: implementation writer delegado; identificador de sesión no expuesto.
- Fecha: 2026-11-12. Rama: `codex/agenda-complete-polish`.
- Commit inicial: `0112a64c7f88822b1d86c4e98565cc64c435f76d`.
- Autoridad: TASK-006, S3/S6/S11-S12 y Log L21 de `odd/tasks/agenda-ux.md`. Sólo widget diario aprobado05; calendario, navegación, formulario, Después de este día e Inicio excluidos.
- Árbol inicial: cambios mensuales CSS/test y documentación/prototipos ajenos preexistentes; preservar íntegramente.
- Diseño: Lexend heredada, Brújula existente; fecha prominente, conteo compacto, columna horaria, acento por evento y acción para fecha seleccionada. Humanist Companion, diales 5/2/5. Sin altura fija ni títulos truncados.
- Orden: `application/pagination.ts::pageItems` ordena por instante/fecha de inicio y conserva orden de páginas; `AgendaDay` filtra con `onDay` sin reordenar. Se reutilizan helpers de fecha, horario y color; sin nuevos modelos.
- Plan: pruebas públicas sintéticas RED; implementación mínima; GREEN y preservación; docs y verificaciones seguras.
- Límite detectado antes de ejecutar: glob completo incluye Docker, migraciones y servidor HTTP; `tsc` incremental escribe caché fuera de alcance. Notificado al coordinador; no ejecutar esos efectos sin autorización específica. Sin navegador/build/servidor ni pruebas de roles/render atribuidas a este escritor.

## Evidencia

- RED: `node --test tests/agenda-day-widget.test.mjs`, exit 1, 0/4: faltaban número prominente (undefined frente a 27), acción/fila de entrega, filas personales y grid horario CSS.
- GREEN final: mismo comando, exit 0, 4/4. Casos públicos: fecha/conteo/título completo/horario/tipo/color, callbacks reales de abrir/crear, anclas de foco, estado ocupado, entrega con aula/rol/reentrega/estado/zona/fecha, vacío, día completo, medianoche, 30 eventos y no mutación. CSS sólo contrato estructural, no render.
- PRESERVE: suite UI pura final, exit 0, 32/32; conserva navegación/selección, creación en fecha exacta, revocación de entregas, límites de mes, colores y formulario. No se modificaron modelos/helpers compartidos ni comandos de producto; diferencial CLI no aplicable.
- El padre sustituyó expresamente los comandos inseguros originales por este contrato UI seguro. `node --test tests/agenda-*.test.mjs` y `npx tsc -p apps/web/tsconfig.json --noEmit` NO ejecutados (cero evidencia); migraciones/servidor y caché incremental no autorizados. No constituyen prueba pendiente exigida por el contrato actualizado.

### Verificación autorizada final

- `node --test tests/agenda-ui.test.mjs tests/agenda-polish-presentation.test.mjs tests/agenda-ux-navigation.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-view-modes.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-visual-polish.test.mjs tests/agenda-month-polish.test.mjs tests/agenda-day-widget.test.mjs`: exit 0, 32 tests PASS. Fixtures inspeccionadas: API sintética/hook runner en memoria, sin servicios ni escrituras.
- `npx --no-install tsc -p apps/web/tsconfig.json --noEmit --incremental false`: exit 0, sin errores.
- `npx --no-install eslint apps/web/src/features/agenda`: exit 0, sin errores.
- `npm run docs:check`: exit 0, 137 archivos/835 enlaces, 0 issues.
- `git diff --check`: exit 0; avisos LF→CRLF sólo en archivos preexistentes de diseño/tarea/coordinador.

### Autorrevisión inicial y entrega

S3/S6/S11-S12 cubiertos en implementación acotada: mismo componente sin bifurcación por rol, fuente heredada, sólo widget05. En este corte inicial faltaba evidencia autenticada; quedó delegada a TASK-007 y se reconcilia al final de este registro. No se implementan propuestas01/04 ni nuevos campos, permisos, dependencias, backend, API o reglas temporales.

Sólo `AgendaDay.tsx` cambia composición. Se conserva `onDay`, `eventColorClass`, `eventTimeLabel`, `selectedDayHeading`, `deadlineParts`/`deadlineLabel`, callbacks, fecha de ocurrencia y efecto de foco. La entrega usa representación local de fila, sin cambiar `DeadlineCard` compartida con otros paneles. `useAgenda::allItems` concatena páginas en orden de `pageItems`; no se reordena ni muta información.

CSS: única inserción delimitada Approved05 en `agenda-ux.module.css`; reglas preexistentes (incluidas correcciones mensuales) intactas. Los nuevos selectores widget no alcanzan Mes/Semana, formulario, Después de este día o mini agenda de Inicio. No alturas fijas, fuentes nuevas, datos simulados productivos, imágenes, !important ni truncamiento. Estados hover/active/disabled/focus y reduced-motion acotados al widget.

Carga/error/sheet siguen bajo `Agenda.tsx` sin cambios. Plan de verificación inicial, posteriormente ejecutado según cierre atribuido: 320/390/768/escritorio, lateral/Día/sheet, títulos largos/muchos eventos/desplazamiento, teclado y retorno de foco, movimiento reducido y paridad docente/estudiante. Sin navegador, capturas, build, reinicio, datos reales, proveedores ni commits propios. Sin scratch ni cachés creados por esta tarea.

Tamaño propio: 39 líneas tocadas en componente, 28 añadidas CSS, 95 de pruebas, 4 líneas de docs canónicas y este registro (aprox. 210 líneas totales). Slice coherente sugerida: widget + pruebas + guías/registro; excluir prototipos y arreglo mensual previo del cómputo propio. El siguiente paso de aquel corte era recompilar y ejecutar TASK-007; su resultado posterior se registra abajo, sin implicar publicación.

## Corrección acotada tras TASK-007 — AUTO sin acento

- Padre autoriza una única tanda correctiva S11-S12 tras verificador `mwe4y7jn-b-4y8r`: ambos roles a 1440/768/390/320 pasaron salvo evento estudiante EVALUATION sin color explícito. El pseudo de 6×6 tenía variables vacías, fondo transparente y ninguna sombra. Es evidencia comunicada por el padre, no observación de navegador propia.
- Continuación sobre HEAD `1c61e2bcb7f8bdf3c31d944f7e444b2679739881`; reparación de arranque ya integrada, excluida. Sólo CSS del widget, pruebas y este registro autorizados. Preservar demás cambios ajenos.
- Procedencia: `event-colors.ts::eventColorClass` devuelve `class`/`activity`/`evaluation` cuando falta color. `agenda-surface.module.css` líneas 8–10 ya define fondos AUTO en swatch/indicator: `--fm-mint`/`--fm-yellow`/`--fm-coral`, todos con acento `--fm-outline`. Tokens base/3D mantienen fondos #c3f1df/#ffe99b/#ffc4af; outline base #303631 y 3D deriva de `--fm-control-border`. Reutilizar variables efectivas, no copiar un naranja ni fijar un outline antiguo.
- Plan: RED sobre salida pública de widget y contrato CSS de las tres categorías; preservar las siete clases explícitas y sus pares actuales. GREEN enfocado, suite UI pura exacta y diff whitespace, foreground ≤30s. SSR/contratos no prueban color computado.
- Advisory previo estudiante320 Crear→Escape con foco BODY permanece fuera de alcance; no modificar. Fixtures QA previas eliminadas y conteos originales restaurados según padre; no tocar datos.

### Resultado de la tanda

- RED inicial `node --test tests/agenda-day-widget.test.mjs`: exit1, 5PASS/3FAIL. CLASS/ACTIVITY fallaban por regla local ausente; EVALUATION además reveló que la comprobación de fuente no admitía su selector agrupado con deadline. Se corrigió sólo esa lectura estructural del test, sin cambiar expectativas ni fuente productiva. RED confirmado antes de CSS: exit1, 5PASS/3FAIL, las tres categorías fallan exactamente por regla widget-local ausente.
- Implementación mínima: cuatro líneas añadidas dentro del bloque Approved05 (comentario + tres reglas `.agenda-day-widget .agenda-widget-row.class/activity/evaluation`). Fondos/acento son los mismos tokens de swatches/indicadores existentes. Sin fallback naranja genérico, cambios de helper/modelo ni redefinición de clases explícitas.
- GREEN `node --test tests/agenda-day-widget.test.mjs`: exit0, 8/8. Tres categorías AUTO con clase pública real y contrato de tokens; preservación de las siete paletas explícitas × tres categorías, pares compartidos exactos y ausencia de overrides locales genéricos. Pruebas previas conservadas.
- `node --test tests/agenda-ui.test.mjs tests/agenda-polish-presentation.test.mjs tests/agenda-ux-navigation.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-view-modes.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-visual-polish.test.mjs tests/agenda-month-polish.test.mjs tests/agenda-day-widget.test.mjs`: exit0, 36/36. Sin timeouts ni corrección de implementación adicional.
- `git diff --check`: comprobación final de whitespace; resultado comunicado en handoff. No nuevo typecheck/lint/docs:check solicitado en esta tanda CSS/tests/log; PASS anteriores no se presentan como nuevas ejecuciones.
- S11-S12: corregido contrato local para acento/halo de todas las categorías legacy/AUTO, preservando explícitos y el widget aprobado. No cambios a componente, callbacks, datos, orden, calendario, Inicio, formulario, estilos compartidos o reparación de arranque.
- Plan de recheck dirigido (cierre atribuido abajo; medición en vivo finalmente acotada a EVALUATION): verificar `getComputedStyle(.agenda-widget-copy, '::before')` en filas CLASS/ACTIVITY/EVALUATION sin color guardado; debe mantener 6×6 y resolver backgroundColor a `--fm-outline`, boxShadow halo3px a `--fm-mint`/`--fm-yellow`/`--fm-coral` efectivos, nunca transparente/none. Comparar clases explícitas (al menos ORANGE/YELLOW y paleta retenida) con sus pares anteriores. Confirmar mismo resultado en lateral y sheet para estudiante/docente; no atribuir prueba real hasta esa medición.
- Sin navegador, servidores, builds/restart, fixtures persistentes, Git mutations o archivos fuera de las tres superficies por este escritor. Scratch: ninguno. El cierre visual posterior se atribuye al padre/verificador a continuación.

## Reconciliación documental tras aceptación acotada — TASK-008

- Fuente: handoff del padre sobre QA inicial `mwe4y7jn-b-4y8r` y recheck dirigido `mwe5gloj-d-6gwb`; no observación de navegador propia. S11-S12 satisfechos en esos recorridos. La aprobación humana de05 fue sobre comparación estática; la prueba funcional posterior corresponde al DOM productivo, sólo widget, no rediseños01/04 ni formulario de colores del prototipo.
- Inicial: ambos roles a 1440/768/390/320 px, layout/paridad/recorridos PASS salvo AUTO; una única tanda CSS añadió tres reglas de categoría, con 36 pruebas UI PASS y 8 enfocadas repetidas PASS por el padre. Recheck final, sin barrido completo nuevo: EVALUATION AUTO estudiante a 1440/320 px, pseudo6×6, fondo rgb(164,139,116) (`--fm-outline`), halo3px rgb(255,196,175) (`--fm-coral`). Naranja #9a3412/#ffedd5 y Dorado #854d0e/#fef3c7 preservados en ambos anchos.
- Limpieza atribuida: dos fixtures propias de la pasada inicial eliminadas con confirmación; recheck creó una fixture estudiante adicional, editó sólo esa Naranja→Dorado y la eliminó con confirmación UI. Conteos originales docente1/estudiante3 restaurados; ninguna fixture pendiente. Sin correos, títulos ni snapshots persistidos aquí.
- Límites: sin capturas nuevas; entregas académicas no observadas en vivo, sólo cobertura unitaria. Foco BODY tras Crear→Escape en estudiante320 es advisory preexistente fuera del widget, no corregido ni ocultado. CLASS/ACTIVITY AUTO tienen contrato unitario; medición final en vivo acotada a EVALUATION.
- Prerrequisito atribuido al padre: job4 `local:restart` exit0/21s, API/web READY3001/3000. Reparación separada commit `1c61e2b` conserva 30s predeterminado, 90s local y 95s externo; no editada en este trabajo. ASSESS sigue no evaluable por ambient untracked: ninguna aprobación nativa inferida.
- Esta tanda sólo reconcilia las dos guías y este registro. RED no significativo para documentación pasiva; validación por lectura estructural, sin ejecutar comandos. `docs:check` queda para el padre al reconciliar registros raíz. Fuente/CSS/tests congelados, sin navegador, servicios o escrituras adicionales.
- Estado: implementado y verificado localmente con los límites anteriores; S5/publicación todavía pendiente, sin atribuir commits/push del widget. Padre debe reconciliar TASK-007/008, estado/commit de TASK-010 y logs raíz; aprobación nativa no disponible y evidencia histórica se conserva.
