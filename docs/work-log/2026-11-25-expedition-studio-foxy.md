# Mi estudio y Foxy AI con la experiencia Expedición · 25 de noviembre de 2026

## Pedido y alcance

- **Pedido:** maqueta de Mi estudio y Foxy AI para revisar flujos y mejorar la experiencia, manteniendo el estilo Expedición. Tras revisarla, el usuario pidió el riel plegable y un botón Herramientas en la cabecera, y la aprobó: «Aprobada, implementá».
- **Decisiones del usuario:** incluir los cambios de API (avance por carpeta y Quiz docente con formatos) y avanzar por tramos, mostrando cada uno antes del siguiente.
- **Rama:** `claude/studio-foxy-expedition-60ff94`, desde `082341ec` (punta de `claude/notifications-profile-expedition`).
- **Autorización:** implementación local. No cubre commit, push, PR, merge ni despliegue.
- **Tablero:** [odd/tasks/expedition-studio-foxy.md](../../odd/tasks/expedition-studio-foxy.md).

## Hallazgos de la app real (harness sintético)

- En Mi estudio hay varias puertas a la misma acción (bienvenida, Herramientas, chips y riel) y el diálogo de herramienta abre un segundo cuadro de texto.
- El bloqueo «Sumá un material primero» aparece al final del formulario, con el botón apagado.
- En la carpeta vinculada sintética, el plan del aula no contó como material (0 materiales). Sin revisar: queda como pendiente aparte.
- En Foxy, «Contexto general» no se entiende, y el formulario de herramienta convive con el composer.
- «Herramientas» ya existía en ambas cabeceras como diálogo modal; la maqueta lo convierte en menú desplegable.

## Publicación

El 2026-11-26 el usuario autorizó commit y PRs apilados por tramo («Sí, por tramos»). Ramas y bases en el [tablero](../../odd/tasks/expedition-studio-foxy.md#seguimiento-git).

- **Base:** la punta remota de PR 21 había avanzado a `2517baa6` con cambios de CI. Esos cambios se cruzan con los míos sólo en los tres registros de suites, y en las ramas nuevas quedaron combinadas ambas entradas.
- **Construcción de los tramos:** cada uno parte del estado final verificado, con los archivos compartidos llevados al estado de su tramo.
- **Pruebas por tramo:** pasaron los tipos y las pruebas de cada tramo (1: 587/587; 2: 273/273; 3: 238/238, con las de la API; 4: 446/446).
- **Coincidencia con el estado final:** el último tramo coincide archivo por archivo con el estado verificado, salvo lo que trajo el remoto.
- **Sin autorización:** merge y despliegue.

## Tramo 1 · Mesa de trabajo

### Cambios

- **Menú Herramientas (ambos roles):** `apps/shared-ui/FoxyChatLayout.tsx` reemplaza la bandeja modal «Herramientas de Foxy» por un menú desplegable anclado a su botón.
  - Se posiciona en coordenadas de la ventana porque el marco del chat recorta lo que desborda.
  - Se maneja con flechas, Inicio y Fin; Escape lo cierra y devuelve el foco; Tab o un toque afuera lo cierran.
  - Elegir una herramienta habilitada lo cierra y deja el foco a cargo de la herramienta.
  - En pantallas angostas (650 px o menos) se abre como hoja desde abajo.
- **Riel plegable (Mi estudio):** el layout acepta `asideMini` y `asideFoldKey`.
  - Plegado, el riel queda en una tira de 76 px con portada, cantidad de temas elegidos, Repaso y Material.
  - La preferencia se guarda en `localStorage` del dispositivo (`foxmind:study-rail`). Foxy no recibe tira, así que no tiene pliegue.
- **Un solo catálogo de herramientas:** `study-tool-catalog.ts` reúne nombre, ayuda, ícono, acción y grupo («Para estudiar» y «Más herramientas»). Lo usan la bienvenida, el menú y el formulario.
- **Formulario sobre el composer:** `StudyToolDock` reemplaza el diálogo `StudyToolDialog`.
  - Comparte el cuadro de texto del composer; el botón dice la acción («Preparar práctica»).
  - Cantidad (5, 10, 15 y la guardada si es otra) y dificultad son botones.
  - Si el cuadro queda vacío, se envía la idea de partida de la herramienta.
  - Queda abierto mientras hay un diálogo encima, por ejemplo Biblioteca.
- **Aviso de material:** `StudyMaterialAlert` aparece arriba del composer cuando la carpeta no tiene material legible.
- **Temas en el composer:** fichas con «Quitar» y «Cambiar», que abre el contexto de la carpeta.
- **Bienvenida:** cuatro intenciones y «Más herramientas». Se quitan la fila de chips (`study-tool-chips.tsx`) y los dos atajos de texto.
- **Estilo:** `apps/web/src/features/study/styles/expedition-desk.css`, importada en `product.css`.

### Verificación

- **Pruebas nuevas:**
  - `tests/foxy-chat-layout-tools-rail.test.mjs`: menú, pliegue y su memoria. 3/3; contra el layout anterior fallan 2 de 3 (la tercera protege que Foxy no tenga pliegue).
  - `tests/expedition-desk.test.mjs`: hoja en la cascada, anclaje y colores. 2/2; 0/2 sin la importación.
- **Pruebas adaptadas** (mismo comportamiento protegido, nueva superficie):
  - `study-tool-drafts-ui`: borrador por herramienta; sin material no envía y ahora conserva lo escrito detrás de Biblioteca.
  - `study-exact-generation-ui`: la imagen se envía desde el composer y «Volver a preparar» restaura tema, cantidad y dificultad.
  - `study-workbench-ui`: bienvenida, plan, tira y fichas con nombre accesible.
  - `study-ui-audit-regressions`: cantidad fuera de los atajos y dificultad conservadas.
  - Afectadas: 120/120.
- **Chequeos:** `tsc` sin errores, `eslint` sin hallazgos, `check-boundaries` y `check-frontend-architecture` sin hallazgos. `run-complete-suite --check`: 740 pruebas clasificadas.
- **Navegador:** harness sintético (`scripts/study-preview.mjs`) con build de producción, una carpeta creada por la API, vinculada al aula y confirmada.
  - **Estudiante a 1440:**
    - El menú queda encima del chat; las flechas mueven el foco; Escape cierra y devuelve el foco; tocar afuera cierra; tras enviar un mensaje sigue disponible.
    - El formulario de Practicar deja un solo cuadro de texto y muestra «Preparar práctica», «En uso» en el menú y las fichas de temas.
    - Plegar lleva el chat de 1062 a 1258 px, se recuerda al recargar y se despliega.
  - **Estudiante a 390:** el menú es una hoja de ancho completo, el riel se oculta y «Cambiar» abre el contexto; sin desborde de página ni de cabecera.
  - **Docente a 1440 y 390:** el menú lista las cinco herramientas de Foxy y elegir una abre su diálogo actual. Sin errores de página.
- **Corregido durante la verificación:**
  - El aviso decía «Podés charlar», pero la API rechaza el chat sin fuentes legibles («Faltan fuentes legibles»). El texto ahora dice que sin material Foxy todavía no puede responder.
  - El aviso y el formulario eran más anchos que el composer; ahora miden lo mismo.

### Límites y pendientes

- La carpeta vinculada sintética volvió a mostrar 0 materiales después de importar el plan del aula, así que el camino feliz de Practicar con material no se ejercitó en el navegador. El envío está cubierto por las pruebas de componentes. El conteo del plan del aula queda como hallazgo aparte.
- El formulario de Foxy sobre el composer, el contexto explícito y el Quiz docente son del tramo 4.

## Tramo 2 · Práctica y repaso

El 2026-11-26 el usuario pidió seguir con este tramo («Seguí con el tramo 2»).

### Cambios

- **Punto de partida:** la práctica ya cumplía buena parte de la maqueta: panel lateral, una pregunta por pantalla, confirmación por pregunta y devolución inmediata. El planificador ya tenía sesiones a elegir, avisos de choque con la Agenda y confirmación antes de agendar. Lo nuevo es lo que faltaba.
- **Sendero de preguntas:** `practiceStep` (en `study-practice-results.ts`) resuelve el estado de cada parada: correcta, para repasar, respondida o pendiente. Una respuesta sin confirmar no revela si está bien. El nombre accesible incluye el estado, por ejemplo «Pregunta 2, para repasar».
  - Colores: pino si salió bien, sendero si hay que repasarla, cielo si está respondida y anillo lago en la actual.
  - `practiceAnswerIsCorrect` reemplaza la comparación que estaba repetida en la pregunta.
- **Resultado con siguiente paso:** un bloque «¿Y ahora?» con dos botones.
  - «Practicar lo que falló» usa los temas con puntaje menor a 1, que salen de `practiceMissedTopics`. Cierra la práctica y abre Practicar sobre el composer con esos temas.
  - «Organizar mi repaso» abre el planificador con esos temas.
- **Repaso en tres pasos:** Fecha, Temas y Horarios, con indicador de pasos.
  - Cada paso valida antes de avanzar: propósito, fechas en orden y al menos un tema. Enter en un paso intermedio avanza en lugar de generar.
  - Los pasos completos permiten volver, y lo elegido se conserva porque todos los campos siguen en el mismo formulario.
  - Al abrirlo desde Herramientas parte de los temas elegidos en el riel.
- **Estilo:** `apps/web/src/features/study/styles/expedition-practice.css`, importada en `product.css`.

### Verificación

- **Pruebas:**
  - Ayudantes del sendero y de temas fallados: 4/4 (antes no existían).
  - Render del sendero y del resultado: `frontend-study-step-views`, 7/7.
  - Planificador por pasos, validación por paso, volver y botones con identidad propia: `study-exact-repaso`, 7/7.
  - Siguientes pasos desde el resultado y temas preseleccionados: `study-workbench-ui`, 8/8.
  - Guarda de la hoja: `expedition-desk`, 4/4.
- **Chequeos:** `tsc` y `eslint` sin hallazgos; `run-complete-suite --check` con 740 pruebas clasificadas; fast 3191/3191.
- **Navegador (harness sintético, build de producción):** carpeta vinculada con un apunte PDF sintético subido por la API (escaneo CLEAN, 1 fuente legible).
  - Practicar con el cuadro vacío envió la idea de partida y generó 5 preguntas. Es el camino feliz que había quedado sin ejercitar en el tramo 1.
  - Las cinco preguntas se respondieron y confirmaron. El sendero terminó como «para repasar», «para repasar», «respondida», «para repasar» y «para repasar», y el dominio del riel se actualizó.
  - El resultado ofrece los dos pasos; «Practicar lo que falló» cerró la práctica y abrió Practicar con los temas.
  - El repaso no avanza sin propósito, pasa por Fecha, Temas y Horarios, y volver conserva el título.
  - A 390 px, los pasos entran en 320 px sin desborde. Sin errores de página.
- **Corregido durante la verificación:**
  - Al pasar del paso 2 al 3, React reutilizaba el botón «Siguiente» como «Preparar mi plan» (type submit) en medio del clic, y el navegador enviaba el formulario: se generaba el plan sin ver el paso 3. Ahora cada botón tiene su `key`.
  - Abierto desde Herramientas, el repaso llegaba sin temas aunque hubiera temas elegidos en el riel.
  - Con la práctica abierta, el composer desbordaba la columna del chat: el contenedor nuevo era una grilla sin `min-width: 0`.

### Límites

- La prueba del `key` comprueba la causa (botones distintos). El efecto del envío en medio del clic sólo se reproduce en un navegador, y ahí quedó comprobado.
- No se generó ni agendó un plan real en el navegador: el paso de propuesta y Agenda no cambió en este tramo y sigue cubierto por sus pruebas.

## Tramo 3 · Colección, avance por carpeta y asistente

El 2026-11-26 el usuario pidió seguir con este tramo («Seguí con el tramo 3»). Incluye cambios de API, autorizados al elegir «Incluir cambios de API».

### Decisión que cambia una regla anterior

- **Antes:** una carpeta activa exigía un programa subido o importado (`validateFolder` y las pruebas «active folder requires an uploaded study plan»).
- **Ahora:** la maqueta aprobada pide «Armarlo a mano» sin archivo, así que la regla pasa a exigir sólo unidades con temas. El archivo sigue siendo obligatorio para «De mi programa», porque Foxy lo analiza.
- **Pruebas:** las dos que protegían la regla anterior (`policy.test.ts` y `service.test.ts`) se actualizaron a la nueva, con comentario y referencia a este registro.
- **Consecuencia:** una carpeta armada a mano empieza sin material legible. El aviso del tramo 1 le pide sumar un apunte antes de practicar.

### Cambios

- **Dominio:** `src/core/domain/study/progress.ts` calcula, para cada carpeta, los temas con evidencia puntuada y el tema más flojo.
  - Usa el mismo umbral que el riel: un promedio de 0,8 o más cuenta como logrado y no es flojo.
  - Sólo cuentan los temas que siguen en la carpeta, y nada se infiere sin evidencia.
- **API del listado:**
  - `GET /api/v1/study-folders` suma `progress` (temas, practicados, tema más flojo) y `nextReview` (próximo repaso agendado).
  - El repositorio calcula temas y puntajes en SQL sobre el estado de cada carpeta, sin cargar las prácticas completas.
  - El próximo repaso sale de un puerto nuevo, `agenda.nextReviews`, con una sola consulta para toda la colección. Usa el mismo vínculo que `scheduled()`: sólo cuentan las sesiones con su evento vigente en la Agenda.
- **Colección:**
  - Banner con la escena de estudio.
  - «Seguí donde quedaste» con la carpeta activa más reciente, su próximo repaso y su tema más flojo. Se oculta mientras se busca o se filtra.
  - Tarjetas con sendero de avance («N de M temas practicados») y el próximo repaso.
  - Estado vacío con el zorro.
- **Asistente:** el paso 2 hace una sola pregunta: «Del aula», «De mi programa» o «A mano».
  - Si hay una sola aula disponible, queda elegida.
  - «A mano» no pide archivo y arranca con una unidad vacía.
  - Sin elegir origen, no avanza.
- **Estilo:** `apps/web/src/features/study/styles/expedition-collection.css`.

### Verificación

- **Pruebas:**
  - `tests/study-folder-progress.test.mjs`: 2/2. Falló antes de existir el módulo.
  - `tests/study-collection-progress.test.mjs`: 2/2. Servicio con dobles: avance, próximo repaso, una consulta a la Agenda y ninguna si no hay carpetas.
  - Paso de origen: `frontend-study-step-views`, 8/8.
  - Secuencia del asistente: sin origen no avanza, «De mi programa» pide el documento y «A mano» avanza. `study-sequence`, 6/6.
  - Colección: `study-workbench-ui`, 9/9.
  - Hoja: `expedition-desk`, 5/5.
- **Chequeos:** tipos de API y web, `eslint`, `check-boundaries`, `check-frontend-architecture` y `run-complete-suite --check` (742 pruebas clasificadas).
- **Navegador:** harness sintético con builds de producción de API y web, con Postgres real.
  - La carpeta practicada en el tramo 2 mostró «2 de 2 temas practicados» y «Tema más flojo: Exposición», calculados por la consulta nueva.
  - El asistente mostró las tres opciones, con «Del aula» y la única aula preseleccionadas. «A mano» no pidió archivo y creó la carpeta «Historia · a mano» activa.
  - Sin desborde a 1440 ni a 390 px, y sin errores de página.

- **Corregido durante la verificación:**
  - Con un enlace a un aula ajena, la regla «aula única elegida» terminaba eligiendo el aula propia, y lo detectó una prueba existente. Ahora la preselección sólo aplica si no se llegó desde un enlace; un enlace sólo se respeta si el catálogo lo autoriza y nunca se reemplaza por otra aula. Hay prueba nueva para el aula única (ignora las archivadas) y para el caso de dos aulas.
  - La ficha de «Seguí donde quedaste» decía «0 de 1 temas practicados»; ahora usa el singular.

### Límites

- No se pudo ejercitar en el navegador una carpeta con repaso agendado: el proveedor sintético no genera planes de repaso (`AI_UNAVAILABLE`). La consulta `nextReviews` se ejecuta sobre Postgres en cada listado sin errores, pero el caso con un repaso existente está cubierto sólo por la prueba del servicio con un doble de Agenda.
- No se escribieron filas de Agenda directamente en la base del harness porque no se pudo atribuir con certeza el contenedor a esta ejecución.

## Estado al cerrar la jornada (2026-11-26)

- **Hecho y verificado localmente:** tramos 1, 2 y 3 (TASK-001 a TASK-003 en DONE). La última suite rápida dio 3199/3199.
- **Sin integrar:** no hay commits, push ni PR. Todo queda como cambios locales en la rama `claude/studio-foxy-expedition-60ff94`. `design/foxy-mi-estudio/` es la maqueta y no forma parte del producto. `.claude/launch.json` sólo sirve para mirar la maqueta y no debe commitearse.
- **Procesos:** el servidor de la maqueta y todos los harness de esta sesión quedaron detenidos. Los contenedores `foxmind-agenda-*` y `foxmind-ai-test-*` que siguen corriendo no son de esta sesión.
- **Pendiente:**
  - TASK-004: Foxy AI. Contexto en la cabecera, «Retomá», formulario sobre el composer, herramienta Quiz con formatos aceptados por la API, «Llevar al aula» y fondo de color de los íconos del menú.
  - TASK-005: documentación, capturas y clasificación final.
  - Hallazgo aparte, sin revisar: el plan importado de un aula no cuenta como material legible.
- **Primer paso al retomar:** correr `python <CLAUDE_CONFIG_DIR>/harness/bin/taskboard.py check odd/tasks/expedition-studio-foxy.md --current`, revisar `git status` y empezar TASK-004 leyendo `apps/web/src/features/foxy/workspace/foxy-workspace.tsx` y `foxy-tool-options.ts`. La herramienta Quiz docente todavía no existe en Foxy.

## Tramo 4 · Foxy AI

El 2026-11-26 el usuario pidió retomar («Reanuda la tarea») después de cerrar la jornada anterior.

### Punto de partida

- Foxy ya tenía un formulario «en línea» sobre el composer, pero con su propio cuadro de texto, una fila de chips y dos sugerencias sueltas.
- El quiz era un interruptor «Trabajo práctico | Quiz» dentro de «Crear una actividad».
- «Llevar al aula» ya existe como «Preparar en Actividades» y «Usar rúbrica en una actividad». Se conservó esa redacción porque la usan el flujo de traspaso y sus pruebas.

### Cambios

- **Quiz con formato (API):**
  - `foxyQuizRequest` suma «Opción múltiple», «Verdadero o falso» y «Mixto». Opción múltiple conserva el pedido histórico, así las conversaciones guardadas se leen igual.
  - `foxyQuizFormat` lee el formato y `foxyQuizBrief` lo saca del texto del docente.
  - En la API, el adaptador pasa el formato a la instrucción y al esquema. Verdadero o falso exige exactamente dos opciones en el esquema; mixto lo pide en la instrucción.
  - Cada formato sigue siendo de respuesta única, así que el modelo del quiz y el traspaso a Actividades no cambian.
- **Quiz como herramienta propia:** el formulario ya no pregunta «Trabajo práctico | Quiz»; lo decide la entrada («Crear una actividad» o «Crear un quiz»). El quiz muestra «Formato de preguntas» y la cantidad. La etiqueta del pedido queda, por ejemplo, «Quiz · 3 preguntas · Verdadero o falso».
- **Herramientas por intención:** `foxy-tool-groups.ts` agrupa «Para tu clase» (plan, actividad, quiz, rúbrica) y «Para explicar» (apunte y, si hay capacidad visual, esquemas). Lo usan el menú y la bienvenida. Se quitaron la fila de chips (`foxy-tool-chips.tsx`) y las sugerencias sueltas.
- **Un solo cuadro de texto:** el formulario de la herramienta ocupa el lugar del composer mientras está abierto, y al cerrarlo o enviar vuelve el composer. Debajo de 720 px se abre como diálogo, como antes.
- **Contexto explícito:** la cabecera dice «Trabajando con» seguido del aula y «aula completa» o los temas elegidos, o «Ideas generales · tu biblioteca». El formulario usa la misma etiqueta.
- **Retomá:** la bienvenida lista las tres creaciones más recientes y las abre en el panel.
- **Estilo:** `apps/web/src/features/foxy/styles/expedition-foxy.css`, con los íconos de herramienta en color también fuera del diálogo.

### Verificación

- **Pruebas:**
  - `tests/foxy-quiz-format.test.mjs`: 2/2. Falló antes de existir `foxyQuizFormat`.
  - Etiqueta del pedido: 2/2; falló antes del cambio.
  - `tests/foxy-workbench.test.mjs` reescrito sobre la nueva superficie:
    - bienvenida agrupada que abre el formulario y oculta el composer;
    - el menú abre el mismo formulario, con Quiz como herramienta propia;
    - Esquema sólo con capacidad visual, y «Retomá»;
    - los radios de formato tienen nombre y mandan el formato;
    - una actividad no pide formato.
  - `foxy-exact-tools` adaptada al menú agrupado.
  - Guarda de la hoja: 6/6.
  - Foxy completo: 15/15 en las afectadas.
- **Chequeos:** `tsc` de API y web, `eslint`, `check-boundaries`, `check-frontend-architecture` y `run-complete-suite --check` (743 pruebas clasificadas).
- **Navegador (harness sintético, builds de producción, docente):**
  - **A 1440:**
    - La cabecera dice «Trabajando con Ideas generales · tu biblioteca». La bienvenida y el menú muestran los dos grupos con íconos de color, y no hay chips.
    - «Crear un quiz» abre el formulario sin el composer (un solo cuadro de texto) y sin «Trabajo práctico». Con «Verdadero o falso», el pedido enviado se lee «Quiz · 3 preguntas · Verdadero o falso».
    - Después de enviar vuelve el composer, y «Retomá» lista la creación nueva.
  - **A 390:** se abre el diálogo «Crear un quiz».
  - Sin desborde ni errores de página.
- **Corregido durante la verificación:**
  - El formulario decía «usa el contexto Contexto general»; ahora usa la misma etiqueta que la cabecera.
  - El texto de los botones de formato quedaba pegado arriba; ahora va centrado.

### Límites

- El proveedor sintético responde una actividad genérica y no genera quizzes, así que el resultado en verdadero o falso no se vio en el navegador. Lo cubren el esquema (exactamente dos opciones) y la instrucción, ambos con prueba; la calidad real depende del proveedor de IA real.
- «Llevar al aula» mantiene su forma actual (botones de traspaso bajo cada propuesta). No se implementó el diálogo de destino de la maqueta.

## Tramo 5 · Documentación, capturas y suites

El 2026-11-26 el usuario pidió seguir con este tramo («Seguí con el tramo 5»).

### Cambios

- **Galería** (`docs/design/current/`): se renovaron seis capturas y se sumaron seis.
  - **Renovadas:** Mi estudio (1440 y 390), la mesa de la carpeta (1440 y 390) y Foxy (1440 y 390).
  - **Nuevas:** el menú Herramientas, la práctica con sendero, el resultado con «¿Y ahora?», el repaso por pasos, el origen de Crear carpeta y Crear un quiz.
  - El catálogo pasa a 55 capturas. Cada entrada nueva o renovada registra fecha, candidato, entorno, navegador y sha256.
  - Se descartaron como alertas los textos del anunciador de ruta de Next, que repite el título de la página.
- **Guía de UX/UI:** Expedición cubre ahora también Mi estudio y Foxy. La sección «Foxy y Carpetas de estudio» describe colección, asistente, mesa de trabajo, práctica, repaso y Foxy.
- **Matriz de flujos:** bloque nuevo con resultado, pruebas, recorrido real y lo no ensayado.

### Corregido durante las capturas

- Con la práctica abierta, la ayuda del teclado empujaba el botón Enviar fuera de la columna; ahora se oculta mientras hay un panel abierto.
- En el teléfono, el contexto de Foxy se leía «TRAB / Id…». Ahora muestra sólo el nombre, sin rótulo ni íconos, recortado con puntos suspensivos («Ideas gener…»).

### Verificación

- Capturas tomadas con builds de producción sobre el harness sintético, a 1440×1000 y 390×844, con animaciones congeladas.
- Sin desborde horizontal ni errores de página.
- Los sha256 del catálogo coinciden con los archivos.
- `check-documentation`: 239 archivos y 1100 enlaces sin problemas.
