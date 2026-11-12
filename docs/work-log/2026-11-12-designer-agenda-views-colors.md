# Agenda · vistas y muestras de color del prototipo

- Escritor delegado de diseño; identificador de sesión no expuesto. Fecha 2026-11-12.
- Rama `codex/agenda-complete-polish`, HEAD inicial `0112a64c7f88822b1d86c4e98565cc64c435f76d`.
- Autoridad: TASK-005, S8–S9, conservar S6–S7; documento actualizado leído completo, incluidos L14–L15. Diseño únicamente, sin aplicación ni publicación. Coordinador mantiene tarea y aprobación.
- Superficies exclusivas: `design/agenda-polish/01-calm-focus.html`, `design/agenda-polish/design.json`, este registro. Todo cambio inicial ajeno, sistema y alternativas se preservan.
- Skills exactas leídas: design, gentle-ui-design, ego-browser. `ego-browser skill`: exit 0, guía completa v2.2.0.
- Navegador autorizado: un TaskSpace nuevo `FoxMind Agenda prototype views`, id **6**, page **p1**. No acceso al espacio humano 5, perfiles, cuentas o datos reales. Queda activo al terminar para el coordinador.
- URL inicial autorizada: `http://127.0.0.1:58576/dNpaXGitH5q6-Hckkhjq_PUXwLriPfxC/d/agenda-polish/`. Snapshot identificó iframe @15 de 01. Su src observado y navegado en p1: `http://127.0.0.1:58576/dNpaXGitH5q6-Hckkhjq_PUXwLriPfxC/files/agenda-polish/01-calm-focus.html`.

## RED antes de cambios

Comandos `ego-browser nodejs <<'EOF'` inline, usando exclusivamente APIs documentadas. Exit 0, observaciones de incumplimiento intencionales (sin assertions que aborten):

- Click público Semana: `{pressed:['Mes'],monthVisible:true,distinctView:false}`.
- Click público Día: `{pressed:['Mes'],monthVisible:true,distinctView:false}`.
- Click público Crear evento: `{dialog:true,colorField:'Azul',swatches:0,preview:false}`. Escape cierra; snapshot final confirma mes intacto.
- No capturas realizadas ni reintentadas. CLI avisa actualización disponible de Ego Lite (0.6.2.8); no se actualiza ni instala nada.

## Procedencia y decisiones

Paleta/familia de `design/system.md`, Lexend original ya incrustada; catálogo leído en `apps/web/src/features/agenda/model/event-colors.ts`: Automático, Azul, Verde, Dorado, Naranja, Rosa, Violeta, Grafito. Se mantienen esos nombres y valores internos, independientes del tipo Actividad. `EventColorFields.tsx` confirma que AUTO resuelve por categoría. Seis pares existentes en `agenda-surface.module.css`. La referencia parcial no captura resolución de AUTO/Grafito: se documenta aquí sin editarla (fuera de alcance). Grafito: `#edf0f5`/`#64748b` de `apps/shared-ui/brujula-parity.css`; AUTO para Actividad: `#ffe99b` y contorno `#7c86a6` de `foxmind-3d-tokens.css` y selectores `.agenda-color-swatch.activity` en `agenda-surface.module.css`. Ninguna invención de categoría o color. Texto en tinta principal, no se usa acento pálido para texto.

## Implementación de maqueta

- Mes conserva 42 celdas y seis filas 86/64 px con resumen diario. Selección pública de fecha compartida por todas las vistas, incluidos días vacíos; datos sólo el 12/11.
- Semana: siete fechas reales del lunes 9 al domingo 15, eventos de día completo y con horario legibles; siete columnas en escritorio, filas fecha/contenido en móvil. Día: fecha elegida, franja de día completo y horario 08:00–16:00 sin duplicar sidebar. Recorte horario expresamente indicado.
- Los botones Mes/Semana/Día controlan paneles distintos mediante hidden y aria-controls; un único aria-pressed activo. Flechas/Hoy deshabilitados con nombres que explican la limitación del prototipo, no acciones engañosamente muertas.
- Colores: ocho muestras con nombre, acento/fondo reales, check, borde y aria-pressed único; altura 48 px. Vista previa del evento con título, horario, tipo y nombre elegido; permanece visible al desplazar opciones mediante sticky. Sólo se actualiza estado de DOM, sin guardado. Campos restantes de lectura conservan sus valores. Cancelar/Escape y retorno de foco preservados.
- Sólo 01, manifest y este registro escritos en esta iteración. No se tocaron sistema, alternativas, fuente productiva, pruebas, servicios, tarea, memoria o Git terminal. Ningún scratch/cache creado.

## Comandos y resultados observados

Los runners se ejecutaron como comandos inline `ego-browser nodejs <<'EOF'` y `node <<'NODE'`, con scripts visibles completos en las llamadas de herramienta de esta sesión; no se crearon archivos auxiliares. Cada bloque de esta lista identifica una invocación y sus stdout/stderr/exit:

1. `ego-browser skill`: exit 0, stdout guía v2.2.0 completa. `git status --short && git branch --show-current && git rev-parse HEAD`: exit 0, inventario inicial conservado, rama y HEAD indicados arriba.
2. Browser creación/navegación/snapshot: exit 0, stdout `{taskSpaceId:6,page:'p1'}` y canvas; siguiente invocación exit 0, src de iframe 01 y snapshot @15. Navegación directa al src observado: exit 0.
3. Browser RED: exit 0, stdout exacto de incumplimiento incluido arriba. Sin errores de setup y sin reintentar navegación.
4. Node estructural inicial: exit 0, stdout `PASS scripts parse, self-contained resources, no disclosures/storage/network, focus/reduced-motion, valid manifest/feature/files; font SHA-256 d1a6bcc8be16439d978c4bd741a38093196cbeae9f6c71e1254076f4b9755628`.
5. Browser reload/viewport inicial: exit 0 y snapshot. Browser GREEN funcional de vistas/fecha: exit 0, selección única correcta Mes→Semana→Día→Mes, fecha 12 intacta, siete fechas 09–15, tres eventos en cada layout relevante, sidebar sólo Mes; selección 13→Semana→Día→Mes conserva 13 y muestra día vacío. Fuente computada Brújula y fontLoaded true. Advertencia de evidencia: el primer mensaje decía “GREEN 1440”, pero su propio payload midió width 1140; NO se acredita ese bloque como prueba de 1440.
6. `help('page.cdp')` dentro del runner y CDP Emulation/Runtime: exit 0, stdout width 1440/height1000/client1425. Las APIs Page de alto nivel pueden restaurar el viewport del host; para comprobar medidas exactas, cada override se siguió inmediatamente de Runtime.evaluate, sin llamada Page intermedia.
7. Browser colores por clic: exit 1. Antes de fallar, AUTO/Azul/Verde/Dorado pasaron fondo/acento/nombre/check/aria/valores conservados. Stderr `ElementResolutionError: page.click timed out after 4012ms: page.click failed: element is not visible in the viewport`. Inspección posterior exit 0: diálogo open true, scrollTop113/client607/scrollHeight1182; Naranja estaba en y527.6875–575.6875, dentro del rect del diálogo y16–625. No se atribuye a la app ni se reintenta el clic. Se continuó por teclado documentado después de observar estado.
8. Browser teclado: exit 0. Naranja/Rosa/Violeta/Grafito activados con focus + Space; PASS fondo y acento exactos, muestra visual/check/nombre/selección única, título Repaso de fracciones y horario09:00–09:45 conservados. Cancelar y Escape: `{open:false,focus:'＋ Crear evento'}` en ambos. Snapshot Semana confirma siete fechas y etiquetas completas.
9. Browser medidas exactas: exit 1. Mes/Semana/Día sin overflow y con fuente/fecha/estado correctos a 1440/390/320; swatches a1440/390 PASS. Fallo concreto a320: Automático client103/scroll131; Dorado103/105; Naranja103/109. Una corrección real: ancho máximo explícito de diálogo móvil y una columna de muestras hasta360px. No se modificó el calendario ni se ocultaron etiquetas.
10. Browser medidas después de esa única corrección: exit 0. stdout `PASS exact 1440/390/320 layout/font/view/swatch checks after one responsive correction.` Las nueve combinaciones de vista/ancho pasan; scroll/client documento1425/1425,375/375,305/305 respectivamente; celdas42, filas86/64/64. Semana escritorio tiene siete columnas de177px; en móvil una columna de309/239px. Eventos largos sin scroll interno. Muestras48px de alto y anchos263.5/159/256px; ningún overflow de etiqueta ni diálogo.
11. Browser prueba final de vista previa visible: exit 0. Después de mover el mini preview antes del selector y hacerlo sticky, ocho selecciones por DOM público focus/scrollIntoView/click en cada ancho exacto1440/390/320. PASS check/aria, nombre, igualdad chip/preview de fondo y acento, targets>=44 y previewVisible true dentro del diálogo en las24 selecciones. No se usó estado interno de aplicación. Escape al terminar; Mes vuelve activo.
12. Browser preservación adicional de fecha y detalle: exit1 por otro fallo de pointer desplazado, después de PASS fecha13 retenida en Día/Mes/Semana. Stderr `ElementResolutionError: page.click timed out after 3010ms: page.click failed: element is not visible in the viewport`. Inspección posterior exit0: Semana, fecha12, detalle cerrado; snapshot da evento ref305. Se detuvo el camino pointer, sin repetir ese clic. Prueba con teclado documentado sobre ref305: exit0, `{open:true,title:'Repaso de fracciones',time:'09:00–09:45'}`. Escape: open false y foco en el mismo evento. Snapshot final de Día demuestra franja Todo el día y horas08:00–16:00, sin sidebar duplicado.
13. Node estructural/paleta final: exit0. PASS parse scripts, manifest/feature/rutas/dimensiones, no disclosures/storage/network/externos, foco/reduced-motion y geometría mensual retenida. SHA original idéntico. 29 valores de color contrastados con sistema + cuatro valores adicionales verificados directamente en fuentes AUTO/Grafito (documentados arriba). Ocho nombres del catálogo intactos y alternativas byte-idénticas a HEAD. Contraste de texto de preview sobre ocho fondos: 12.03,11.92,13.24,13.06,12.69,12.37,12.32,12.73:1 respectivamente; no se usa el acento AUTO de bajo contraste como texto ni única señal de selección.

14. `git diff --check`: exit0, sin errores de whitespace; sólo advertencias LF→CRLF de archivos previamente modificados y de 01/manifest. `git status --short`: exit0, inventario inicial intacto más este nuevo registro; ningún scratch/cache. Las modificaciones de 01/manifest ya existían al inicio y se refinaron sólo dentro del alcance.

Los comandos exitosos no devolvieron errores; stderr informativo repetido del runner: `[ego-browser:notice] Ego Lite update is available (current 0.6.2.8)`. No upgrade/instalación autorizado ni realizado. Dos errores pointer se conservan como límite de automatización; no se hicieron retries de timeout, capturas ni afirmaciones de cobertura pointer exhaustiva. El fallo responsive sí recibió una corrección y pasó en su siguiente verificación; no se agotó un ciclo de correcciones de producto.

## Entrega y límites

S8–S9 cubiertos en prototipo; S6–S7 preservados como estilo, Lexend y diálogos sin disclosures. No se prueba igualdad autenticada S3, persistencia, seguridad, motor calendario completo ni aceptación visual humana de las tres vistas. Sin capturas; evidencia DOM/teclado/CDP, no apreciación estética automatizada. Sistema de referencia conserva su captura parcial anterior por prohibición de edición en esta unidad; procedencia de los colores adicionales queda en este registro.

TaskSpace6 sigue activo y propiedad del agente, p1 con el artboard01 directo observado; no se llamó finish/handOff. El coordinador debe cerrar/presentar el espacio y refrescar canvas. La actualización de Ego Lite queda pendiente sólo si el humano la autoriza.

Para probar: abrir 01 en canvas o su src observado, pulsar Semana y Día; seleccionar13 para ver vacío y volver12 para los tres eventos; Crear evento → elegir muestras de color (también Tab/Espacio) → observar mini preview → Cancelar/Escape. No hay guardado. Semana apilada y selector de una columna a320 priorizan títulos legibles, a costa de más desplazamiento. La aplicación y publicación siguen bloqueadas hasta autorización explícita.
