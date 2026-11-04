# Pulido visual de Agenda — preparación de diseño

- Agent / role: root, coordinador
- Session or task ID: unavailable
- Date: 2026-11-04
- Branch / worktree: codex/agenda-polish — C:/Users/alejo/.codex/worktrees/foxmind-agenda-polish
- Starting commit: a3afdc7
- Phase and detailed task/spec links: docs/design/foxmind-3d/flows/agenda.md; odd/tasks/agenda-compact-event-form.md; odd/tasks/agenda-event-color.md
- Status: completed

## Request and scope
Rediseño visual de Agenda en worktree separado: quitar título de sección superior; banner ilustrado nuevo con CTA integrado; quitar zona/cambiar de cabecera; ajustar separación de paneles y mostrar Foxy completo. Formulario sin Más opciones ni resumen automático, observaciones como último campo, colores más claros. Sin cambios de API/datos ni publicación.

## Work performed
Leídos roadmap, protocolo de registros, contratos previos y componentes actuales. Main estaba limpio sobre a3afdc7. Creado worktree propio desde ese commit sin modificar main ni otros worktrees. Dirección existente crema/naranja y Foxy 3D conservada. Preparación R2 de dirección visual; aprobación del nuevo diseño pendiente antes de implementar.

## Verification
Observados git status --short (limpio), git branch --show-current (main), git log -1 y git worktree list. Inspección de Agenda, AgendaHeader, EventForm, EventAdvancedFields, EventColorFields y Upcoming. Dos intentos iniciales de lectura usaron rutas inexistentes components/; corregido al localizar apps/agenda-ui. No se ejecutaron pruebas funcionales porque aún no hay cambio de comportamiento.

## Commits and outcomes
Sin commits, integración, push ni deploy.

## Handoff
Generar y presentar banner y propuesta concreta; confirmar dirección UX/UI según instrucciones EWP del usuario. Luego implementar y verificar únicamente en este worktree. Más opciones contiene fecha multiday y zona: conservar acceso directo a esos controles para no perder compatibilidad al eliminar el desplegable. La zona interna del calendario se conserva aunque se retire su control visual.

## Preparación de diseño terminada
Generado banner con image_gen usando arte existente como referencia de identidad/estilo. Fuente guardada en docs/design/agenda-polish/banner-proposal.png y propuesta concreta en proposal.md del mismo directorio. Imagen observada: Foxy/calendario a la derecha y espacio de contenido a la izquierda, sin texto ni controles rasterizados. Estado actual: pendiente de aprobación UX/UI, sin modificación de código de producto. No se creó registro TTP de ejecución porque la dirección todavía no fue aprobada. Próximo paso: aprobar propuesta e implementar en worktree aislado.

## Revisión solicitada por el usuario
El usuario rechazó la primera composición por concentrar la escena a la derecha y dejar lisa la izquierda. Solicitó ilustración en todo el ancho. Se actualiza proposal.md y se genera una segunda versión con calendario/libros a la izquierda, planificador en el centro y Foxy a la derecha, dentro de un ambiente continuo. Esto modifica la dirección propuesta, no constituye aprobación de implementación. Sin cambios en código de producto.

Segunda versión generada mediante image_gen y observada: calendario/libros/plantas a la izquierda, reloj y planificador central, Foxy a la derecha; escritorio y ambiente ilustrados en todo el ancho, sin mitad lisa. Arte guardado en docs/design/agenda-polish/banner-proposal-v2.png. Instrucción de generación: conservar identidad 3D y paleta, distribuir escena de planificación de izquierda a derecha, sin espacio liso reservado, sin texto/UI. Propuesta pendiente de aceptación visual. Sin pruebas funcionales por ser revisión de arte únicamente. No commits ni publicación.

## Tercera revisión solicitada
El usuario valora el estilo de v2 pero solicita menos información visual y una imagen más tranquila. Define Foxy a la izquierda y Nuevo evento a la derecha para evitar que el botón tape al personaje. Requisito explícito: Foxy visible en cualquier tamaño de pantalla. Se genera v3 con perspectiva más amplia, menos objetos y continuidad ilustrada en todo el ancho. En implementación se deberá adaptar la composición móvil, sin confiar en un recorte cover centrado que pueda ocultar al personaje. Dirección en revisión; código de producto aún sin cambios.

Resultado v3: generado y observado con Foxy a la izquierda, calendario y planificador, ambiente continuo más tranquilo y derecha libre de personaje para el CTA. Primer resultado tenía una oreja extra; corregida mediante image_gen y observada la versión corregida con dos orejas. Fuente final docs/design/agenda-polish/banner-proposal-v3.png. Prompt: perspectiva amplia de escritorio, Foxy izquierdo, menos objetos, derecha tranquila dentro de la escena continua; sin texto ni botones. La corrección conserva composición y elimina solo la oreja extra. Requisito responsive sigue pendiente de implementación y comprobación en navegador; no se afirma visibilidad móvil verificada. Sin cambios funcionales, commits ni publicación.

## Cuarta revisión solicitada
El usuario detectó que v3 alteró la identidad y la posición de las orejas de Foxy; por tanto la afirmación previa de corrección de dos orejas no implica aceptación anatómica ni visual. Se itera usando el banner original agenda-hero-1600.webp como referencia explícita de identidad y v3 como composición objetivo. Mantener Foxy a la izquierda, pocos objetos y derecha disponible para CTA. Generación v4 en curso; no se cambia producto.

Resultado v4 generado con image_gen: cabeza frontal, dos orejas equilibradas en ambos lados superiores del cráneo y rostro redibujado con referencia al Foxy original. Observados orejas dentro del cuadro y composición tranquila preservada, Foxy izquierdo y zona de CTA derecha. Guardado en docs/design/agenda-polish/banner-proposal-v4.png. Prompt de revisión: rehacer solo cabeza/orejas con identidad de referencia original, pose frontal y dos orejas anatómicamente coherentes; conservar escena, cuerpo y ubicación. Pendiente aceptación visual del usuario, sin pruebas responsive ni código modificado.

## Implementación autorizada y verificación local
El usuario aprobó explícitamente el banner v4 el 2026-11-04, tras el pedido original de aplicar el pulido en worktree. Se ejecutó el alcance definido en docs/design/agenda-polish/proposal.md y odd/tasks/agenda-visual-polish.md. Solo root escribió producto/registro; revisión independiente de lectura por /root/agenda_review, persistida separadamente en 2026-11-04-agenda-review-attributed.md.

### Cambios
- AgendaHeader: arte aprobado optimizado a WebP800/1600, imagen completa sin cover, título/CTA HTML dentro de cabecera. Contenido debajo de imagen en móvil para mantener Foxy visible y CTA derecho sin taparlo. No se sirve el PNG maestro.
- AgendaScreen: clase local screen oculta la ubicación superior solo en Agenda. Sin cambios de AppNavbar compartido ni navegación.
- Agenda: columna lateral propia apila día y próximas entregas con16px; grid horizontal24px y controles existentes intactos. Imagen de entregas con altura natural/object-fit contain.
- Formulario: Más opciones y resumen automático retirados; controles existentes multiday/zona dentro de Cuándo por composición, Observaciones último campo. Color mantiene radios nativos/tokens y añade muestras amplias, fondos, etiquetas y check. Se conservan foco, errores, protección de borrador, acciones de edición y recurrencia.
- Se actualizan dos expectativas históricas de tests por los requisitos explícitos nuevos: ausencia del details y del selector de zona de cabecera. No se modificaron contratos de backend/modelo ni API/DB.

### Evidencia observada
- RED focal: 2 fallos reales por details/resumen existentes y falta del nuevo arte. Un primer ensayo del test de cabecera omitió props antiguas y fue corregido antes de registrar RED válido.
- GREEN y regresión final: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/agenda-visual-polish.test.mjs tests/agenda-ui.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-form-model.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-event-color-model.test.mjs tests/agenda-polish-presentation.test.mjs`: 60 PASS,0 FAIL,0 SKIP.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`: exit0.
- `npm run lint:boundaries`: exit0,129 excepciones congeladas. Primer intento detectó arista nueva EventWhenFields→EventAdvancedFields; se corrigió usando composición children desde EventFields sin alterar baseline ni excepciones.
- Build directo `npm run web:build` falló por resolución Turbopack de node_modules enlazado fuera del root del worktree. Intento --webpack falló con imports TypeScript compartidos fuera de apps/web. No se contaron como PASS.
- Build final: `node .test-artifacts/agenda-polish/build-isolated.mjs`: exit0, compilación/tipos y6 páginas estáticas. Copia exacta del candidato apps/src/package/lock en directorio ignorado original .test-artifacts/agenda-polish-build-20261104; override turbopack.root solo en config de staging para resolver dependencias existentes. No se modificó configuración rastreada ni instaló paquete. Primer intento del helper esperaba tsconfig raíz inexistente; corregido antes del build exitoso.
- Navegador ego-browser, fixture Vite con componentes/estilos reales y API en memoria: 1440/768/390/320 sin overflow; Foxy completo y CTA sin superposición; sidebar16px, imagen lateral contain, description último campo, sin details/resumen, footer visible. Capturas y métricas en docs/work-log/evidence/2026-11-04-agenda-polish.
- Teclado: flechas cambian radio azul/verde, check y foco visible. Alta inválida enfoca título y no escribe. Fecha final, UTC, verde y observaciones conservados al guardar/reabrir en fixture. `fill` de date no disparaba estado React; se usaron teclas nativas. Expectativas iniciales de fecha de automatización fallaron; el valor finalmente elegido por teclado2028-12-03 se comprobó igual en payload y edición posterior. No es prueba de backend.
- Revisor independiente reejecutó55 pruebas con PASS y observó capturas; sin hallazgos funcionales. No realizó navegador/backend/build propios.
- `npm run docs:check`: 0 issues; control final y diff-check se registran al cierre.

### Límites y entrega
Sin backend autenticado, proveedores, datos reales, revisión nativa, commit, integración, push ni deploy. Preview aislada propia en http://127.0.0.1:53241/.test-artifacts/agenda-polish/ con datos sintéticos; no sustituye la instancia real de otros agentes. Scripts y variantes rechazadas se conservan ignorados en .test-artifacts/agenda-polish; arte aprobado y evidencia útil quedan en docs. Las fases históricas del roadmap no se reabrieron.

### Handoff vigente
Pulido local implementado y comprobado; revisar visualmente la entrega en preview o capturas. Integración a main/publicación requieren instrucción posterior. No queda tarea de implementación dentro del alcance solicitado.


Cierre: `npm run docs:check` final comprobó138 archivos/1730 enlaces con0issues; `git diff --check` exit0. Tareas TASK-001/002/003 DONE con evidencia. Revisión final independiente sin hallazgos y capturas finales actualizadas tras resolver especificidad CSS. Preview propia quedó disponible para revisión visual; rama sin commits nuevos ni integración/publicación. No hay cambios pendientes del alcance implementado.

## Seguimiento autorizado — cabecera responsive, tipografía y escala
El usuario solicita corregir la tarjeta crema que aparece en pantallas pequeñas y la legibilidad del texto; unificar tipografía con Inicio, tomar como referencia CTA del worktree Mis aulas y reducir la ilustración de próximas entregas. Ruta R1 de corrección visual dentro del alcance aprobado, sin nueva dirección ni cambios funcionales. Inspeccionados read-only codex/mis-aulas-header y checkout Inicio: CTA naranja #cf3d06 con borde crema2px, radio22px, sombra, min52px y fuente16px; Inicio y sistema actual usan Segoe UI. Agenda aún declara Fredoka Auth en variable local y diálogo; breakpoint800px coloca copy/CTA estáticos debajo del arte, causando la tarjeta crema. Se reabren solo TASK-001 y TASK-003; TASK-002 conserva su evidencia histórica.


## Resultado del seguimiento responsive
- Cambios acotados a AgendaHeader y CSS de Agenda. Banner aprobado intacto; copy y CTA permanecen superpuestos en todo el rango sin extensión crema debajo. Hasta480px se oculta únicamente la frase secundaria para priorizar título20px y acción44px; resto conserva bajada. Foxy completo y libre de título/acción.
- Tipografía: títulos/calendario/diálogo usan la variable del cuerpo Segoe UI como Inicio. Un primer cambio local no ganaba contra sky-theme.css; se corrigió con selector del módulo más específico, sin tocar estilos compartidos ni otro worktree. Comprobado por getComputedStyle en navegador.
- CTA toma referencia del worktree codex/mis-aulas-header, solo lectura: ícono plus existente, naranja#cf3d06, borde crema2px, radio22px, sombra, hover/active y reduced-motion;52px/16px escritorio,44px/14px compacto.
- Próximas entregas: ilustración156x104px, proporción natural y contain, centrada; ya no crece al ancho del panel.

### Comprobaciones del seguimiento
- `node --test tests/agenda-visual-polish.test.mjs tests/agenda-polish-presentation.test.mjs tests/agenda-event-form-view.test.mjs`:15PASS/0FAIL/0SKIP. No se añadieron tests que copien CSS.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`, `npx eslint apps/agenda-ui/AgendaHeader.tsx`, `node scripts/check-boundaries.mjs`: exit0;129 excepciones intactas.
- `node .test-artifacts/agenda-polish/build-isolated.mjs`: exit0 sobre copia final con override de root solo en staging;6 páginas estáticas, sin cambiar configuración rastreada.
- Ego-browser browser-15:12observaciones de ancho real320/360/390/480/500/600/768/800/802/1024/1102/1440. Solicitados801/1101 se observaron802/1102 por redondeo del viewport; no se presentan como medidas exactas. En todas: banner altura igual al arte, sin overflow ni intersección título/bajada/CTA, Foxy separado, fuenteSegoe y miniilustración156x104. Capturas1440/768/500/390/320 observadas.
- Ego-browser browser-17: Tab/Shift+Tab muestra foco, Enter abre formulario real; título del diálogoSegoe y description último campo; hover con reduced-motion no transforma y transición0s. Ensayo16 con foco programático no comprobó modalidad de teclado y falló; reemplazado por tabulación nativa, sin modificar producto para esa comprobación.
- Evidencia nueva en docs/work-log/evidence/2026-11-04-agenda-polish/responsive-followup. Evidencia anterior preservada como historia. La revisión independiente previa pertenece a su candidato; este seguimiento cosméticoR1 se comprobó en línea sin repetir delegación.
- Sin cambios de API/datos/formulario funcional, sin escritura en worktrees de Inicio/Mis aulas, sin commits/main/push/deploy. La preview propia conserva URL y HMR.


Cierre del seguimiento: docs:check138archivos/1730enlaces/0issues; diff-check finalPASS tras normalizar ubicación del import y EOF de AgendaHeader. TASK-001 y TASK-003 DONE otra vez con evidencia nueva; TASK-002 no reabierta. Preview actualizada en la misma URL, sin integración a main.
