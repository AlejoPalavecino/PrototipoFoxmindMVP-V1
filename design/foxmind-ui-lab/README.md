# FoxMind · un lugar para aprender

Propuesta navegable en HTML, CSS y JavaScript. No modifica la aplicación real, no envía archivos, no ejecuta IA ni usa sus credenciales. Los datos académicos son ejemplos; las acciones persisten sólo en este navegador y se pueden reiniciar.

## Diseño de herramientas generativas

Para quizzes, esquemas y futuras generaciones, incorporar las interacciones en las pantallas de esta maqueta. Usar Nunito, los controles de la plataforma y la navegación propia de cada rol. Para consultar una fuente, usar un botón con el nombre de la acción y el lector de la plataforma. Evitar el desplegable nativo con triángulo de las primeras propuestas.

Para probar la generación, abrí Mi estudio → Biología, a mi ritmo o Foxy AI → Clase sobre división celular. **Probar el chat** también recupera la conversación de ejemplo del rol activo. En **Herramientas**, elegí el recurso, completá el pedido y los temas y confirmá. El trabajo y la creación quedan vinculados a ese chat en el navegador. La maqueta utiliza contenido preparado de mitosis.

Desde **Creaciones** se puede abrir una revisión guardada o volver a preparar un recurso como copia. Los recursos textuales tienen un editor visual y descargas en PDF y Word. La demostración guarda los datos en este navegador.

## Abrir y recorrer

- Abrir `01-foxmind.html` directamente en el navegador. Incluye CSS, JS, imágenes y tipografía; no necesita instalar dependencias ni conectarse a internet.
- Vista local: `http://127.0.0.1:4173`. Para iniciarla desde la raíz del worktree: `node design/foxmind-ui-lab/serve.mjs`.
- La barra superior permite elegir **Docente / Estudiante**, ver **Recorridos** y **Reiniciar** los ejemplos. No propone cambiar de rol en una cuenta real.
- Recomendada: Inicio docente → revisar entrega de Marina → guardar → publicar; cambiar a Estudiante → Mis aulas → Actividades → ver devolución. Luego responder **Descubriendo la luz** y confirmar la entrega.
- **Recorridos** permite probar espera de IA, error/reintento y búsqueda sin resultados. Para unirse al aula de ejemplo: **482619**.
- Fuentes: `template.html`, `styles.css`, `core.js`, `screens.js`, `workspaces.js`, `flows.js`, `events.js`; assets locales con licencia de Nunito. Instalar las dependencias del laboratorio con `npm ci --prefix design/foxmind-ui-lab` y regenerar el HTML con `node design/foxmind-ui-lab/build.mjs`.

El HTML de entrega pesa aproximadamente 1671 KB. Las fuentes separadas facilitan ajustes; el archivo generado incorpora los recursos en base64, por lo que no es un diff productivo para integrar. `refinement.css` y `refinement.js` contienen la segunda iteración visual; `home.css` y `home.js`, Inicio; `widgets.css`, actividades y entregas; `day-widget.css/js`, la agenda del Inicio; `alignment.css`, el ajuste final de espaciados. Se incorporan con el mismo build.

## Decimosexta iteración · Notificaciones y Mi perfil

**Bandeja por rol:** notificaciones agrupadas por fecha, filtros Todas/No leídas y por tipo, lectura individual o conjunta y contador derivado. Cada aviso tiene origen y acción explícitos: revisar una entrega, consultar devolución, revisar invitación, entrar al aula, ir al muro o consultar un evento. Una invitación aceptada cambia su acción. El contenido retirado o sin acceso muestra una explicación recuperable; los avisos no aceptan invitaciones ni confirman entregas automáticamente. Las notificaciones representan los datos de esta demo, no una conexión en tiempo real con un servicio de avisos.

**Perfil con vista previa:** nombre, apellido y avatar se guardan juntos. Fotos ficticias existentes, iniciales y cuatro avatares Foxy, con catálogo accesible y confirmación previa. El avatar guardado aparece en navegación y mensajes propios. El borrador queda disponible al volver durante la sesión, incluso si falla un guardado en otra sección; descartar o reiniciar lo elimina. Correo y rol son de consulta. Contraseña y sesión permanecen informativas y no solicitan credenciales.

Se mantienen Nunito, naranja/pasteles, bordes definidos y acciones alineadas. La bandeja tiene una cabecera compacta y filas legibles; Mi perfil adapta su densidad en escritorio de poca altura para dejar Guardar cambios visible. Los cuatro avatares se reutilizan de `apps/web/public/brujula/avatars`; no se generaron nuevas imágenes.

Verificación: suite de perfil de ambos roles, **15 controles de notificaciones**, **4 de transiciones**, **10 de límites de componentes**, **4 de perfil con 638 px de alto**, **60 combinaciones responsive y 2707 muestras de contraste CSS sin fallos**. Regresiones de otras pantallas/contexto y recorrido Ego Lite comprobados. Registro: `docs/work-log/2026-11-15-root-ui-lab-notifications-profile.md`; fuentes `notifications.js/css` y `profile.js/css`; scripts `review/account-notifications/`.

## Decimoquinta iteración · Tu biblioteca de contexto

**Biblioteca junto al mensaje:** ambos roles pueden abrir un panel temporal para agregar PDF, Word o PowerPoint, buscar, consultar y quitar archivos propios. Los filtros **Del aula / Mis materiales** distinguen el origen; Preparando, En contexto y error con Reintentar indican qué fuentes están disponibles. El chat mantiene su ancho y alto al cerrar el panel, junto con el borrador y el punto de lectura.

**Carpeta con aula opcional:** durante los mismos cuatro pasos de creación se puede elegir un aula existente del estudiante o un recorrido propio. El aula aporta una copia editable del recorrido inicial y referencias a sus materiales vigentes, sin obligar a subir otro programa. También se puede vincular, cambiar o quitar el aula desde el contexto de una carpeta existente. Quitar el vínculo conserva archivos privados, plan propio y conversaciones. Los archivos propios pertenecen a la carpeta y están disponibles en sus chats; la biblioteca funciona también sin aula.

**Foxy docente:** General + archivos propios o Aula + archivos propios. La biblioteca privada pertenece al chat y no publica nada en el aula. Cambiar de contexto en una conversación iniciada abre otra conservando los archivos propios; **Nuevo chat** explícito comienza sin esos archivos. Compartir una creación sigue requiriendo revisar y confirmar su destino.

Las referencias del aula se resuelven desde los datos locales actuales al consultar o enviar, excluyendo aulas no disponibles y materiales privados/borradores docentes en estudiante. Las fuentes listas se guardan como referencia en cada mensaje. La lectura real de documentos, la IA y la sincronización con un servidor siguen fuera de esta maqueta.

Verificado: recorridos y errores de biblioteca, asistente de carpeta con/sin aula, aislamiento entre carpetas/chats, actualización y pérdida de acceso, navegación con historial, foco y nombres tratados como texto. **115 combinaciones responsive de 320 a 1440 px y 4463 muestras de contraste CSS sin fallos**, más recorridos y capturas Ego Lite de ambos roles. Fuentes específicas: `foxy-library.js/css`, contexto, conversación y asistente de carpetas. Registro: `docs/work-log/2026-11-15-root-ui-lab-context-library.md`; scripts `review/context-library/`.

## Decimocuarta iteración · Una sola cabecera

La navegación expandida muestra las aulas como lista vertical completa, sin heredar el estilo de las pestañas horizontales. En el rail contraído se ocultan sus accesos rápidos. Se ajustó la densidad de la navegación a poca altura para mantener el perfil visible.

Foxy y la carpeta de estudio tienen una sola cabecera: contexto, Historial, Herramientas, Creaciones y **Nuevo chat**, con texto visible y ubicado al final. Se retiró el encabezado repetido de logo/título; el h1 semántico sigue disponible. Se recuperan 50 px de altura para el contenedor del chat en escritorio. En tablet/móvil se acomodan las acciones en dos filas, manteniendo el acceso al menú y regreso a carpetas.

Validación: 38 controles específicos, 70 combinaciones responsive, 2209 muestras de contraste sin fallos, recorridos de paneles/contexto/Nuevo chat, comparación del contenido principal de otras pantallas y revisión visual con Ego Lite. Registro: `docs/work-log/2026-11-15-root-ui-lab-chat-toolbar.md`.

## Decimotercera iteración · El chat, con espacio propio

**Foxy docente y chat de carpeta:** conversación a todo el ancho disponible, lectura de 16 px en escritorio y 15 px en móvil, escritura siempre visible. Historial, Herramientas y Creaciones se abren en paneles temporales. No quedan columnas laterales ocupando espacio: cerrar conserva el borrador y el punto de lectura. Historial permite buscar, renombrar y retomar; herramientas y creaciones mantienen los recorridos anteriores.

**Máximo espacio y navegación:** al entrar por primera vez al chat, la barra lateral queda en un riel de 76 px con íconos y foto de perfil. Expandir/contraer recuerda la elección; los accesos tienen nombres accesibles. En móvil se integra el menú en la cabecera del chat, evitando la segunda barra. El contenido ocupa el alto disponible, con compositor fijo y lectura de ancho cómodo.

**Mensajes y esperas:** foto ficticia del usuario y logo de FoxMind en cada mensaje. Preparar esquemas, apuntes o planes vuelve al chat y muestra tres etapas con mensajes específicos, por ejemplo «Diseñando tu esquema» y «Uniendo las últimas flechas». Se puede detener/reintentar; una recarga informa la interrupción. El resultado permanece en la conversación de origen, con acceso a revisión/edición y publicación/Agenda según rol. Fallar al guardar muestra error rojo y conserva la solicitud.

Fotos ficticias creadas con Imagegen integrado: [docente](assets/profile-docente.webp) y [estudiante](assets/profile-estudiante.webp); [prompt docente](assets/profile-docente.prompt.txt) y [prompt estudiante](assets/profile-estudiante.prompt.txt). No corresponden a personas reales ni son fotos del usuario.

**Contexto explícito:** General usa la conversación y adjuntos; Vincular a un aula incluye su plan completo, Biblioteca y actividades. La selección permite consultar los contenidos y sus cantidades sin marcar cada recurso. Cambiar el aula de un chat con mensajes crea otra conversación y conserva la anterior. Cada envío guarda una referencia al contexto disponible en ese momento, incluyendo adjuntos; es una simulación local, no una consulta a IA real. En estudiante se muestra el contenido de la carpeta actual y el acceso a Materiales y plan.

**Inicio:** los eventos de «Tu día, con calma» ya no se estiran para igualar el widget vecino. Ambos roles usan tarjetas compactas de 74 px en los ejemplos, que crecen cuando un título necesita otra línea. Se conservan horario, tipo, duración, título, color y acceso al detalle.

Verificación, fallos y límites en `docs/work-log/2026-11-15-root-ui-lab-foxy-focus.md`. Fuentes específicas: `foxy-focus.css`, `chat-expansion.css`, `foxy-context.js`, `foxy-generation.js`, conversación/eventos/modelo de Foxy y ajuste de `day-widget.css`/`alignment.css`. El HTML sigue siendo autocontenido; esta iteración no modifica la aplicación real.

## Duodécima iteración · Foxy y tu espacio de estudio

**Crear carpeta como Crear aula:** misma composición de cuatro pasos, portada, programa, elección manual/Foxy, unidades y temas editables, revisión y borradores recuperables. La colección conserva las tarjetas de aulas adaptadas al estudio privado.

**Conversar y volver:** historial buscable y renombrable, conversaciones independientes por carpeta, contexto docente general o de aula, materiales seleccionables y adjuntos de ejemplo. El compositor permanece visible; mensajes, historial y herramientas tienen su propio espacio. En móvil se alternan Chat, Herramientas, Creaciones e Historial, sin apilar todos los paneles. La respuesta muestra su avance en línea y se puede detener o reintentar.

**Crear y compartir:** herramientas diferenciadas por rol; intención requerida antes de preparar una propuesta. Apuntes, esquemas, planificación y rúbrica tienen ejemplos distintos y un editor. El docente revisa y publica una copia guardada directamente en la Biblioteca del aula y tema elegidos. Repetir la publicación de la misma versión no duplica el material. Editar la creación privada no cambia lo que ya se compartió.

**Repasar con un plan:** estudiante → objetivo, fecha, temas y tiempo → sesiones editables → selección y confirmación → Agenda. Se advierten horarios coincidentes y se evitan sesiones duplicadas. El evento permite volver al plan de la carpeta correspondiente. Las prácticas y simulacros de tres preguntas guardan avance e intentos; después de confirmar muestran orientación y permiten reintentar sin borrar los resultados anteriores.

Verificado en HTML `file://`: 36 comprobaciones de recorridos, 27 de teclado/errores/densidad, 20 comparaciones de preservación, pruebas completas de carpeta y práctica; 100 combinaciones principales a 320/390/768/1024/1440 px, 15 adicionales con contenido largo y práctica, y 4134 muestras de contraste CSS sin fallos. Ego Lite recorrió conversación, publicación/lectura en Biblioteca, plan → Agenda → carpeta y asistente de carpeta. Registro y límites: `docs/work-log/2026-11-15-root-ui-lab-foxy-study.md`; scripts `review/foxy-study/`; evidencia `.test-artifacts/ui-lab/foxy-study/`.

Fuentes: `study-folders.js/css`, `foxy-model.js`, `foxy-workspace.js/css`, `foxy-flows.js`, `foxy-planner.js`, `foxy-events.js`, `study-practice.js/css`. Se reutilizan ilustraciones existentes; no fue necesario generar un nuevo asset. Generación y archivos siguen simulados; la descarga contiene el texto guardado en TXT. Los eventos usan el año ilustrativo 2026 y se comparten entre roles de demostración. Cambiar un evento en Agenda no reescribe la sesión del plan; abrirlo desde el plan usa el evento vigente. No acredita privacidad, IA ni almacenamiento productivos.

## Undécima iteración · Tu agenda, a tu ritmo

**Mes, Semana y Día:** calendario con grilla estable y panel cálido del día; eventos con horario, duración, tipo y color legible. Semana agrupa los días con eventos y el día seleccionado, evitando filas vacías repetidas. Los siete días permanecen disponibles arriba. Día enfoca un solo listado. Las flechas avanzan el período correspondiente y conservan una fecha válida. Se identifica el 13 de noviembre de 2026 como fecha de ejemplo.

**Crear y editar:** un formulario con opciones visibles de tipo y seis colores, fecha, horas, notas y vista previa en vivo. Crear desde un día conserva esa fecha. Los errores aparecen en rojo junto al campo, con foco; los éxitos, en verde. Cancelar cambios permite seguir editando o descartarlos. Eliminar requiere confirmación. Un fallo de guardado conserva el borrador y reintentar no duplica eventos. El widget de Inicio usa el mismo editor y datos.

Fuentes: `agenda.js`, `agenda-events.js`, `agenda.css`; integración en build y eventos. Se reutiliza la identidad existente y se dibujan fechas dinámicas con CSS, sin nueva ilustración raster. **56 comprobaciones**, **65 combinaciones de vistas/tamaños** entre 320 y 1440 px y **5523 muestras de contraste CSS** sin fallos. Incluye 12 comparaciones de preservación de Inicio, Mis aulas y Actividades, textos largos, seis colores, errores de almacenamiento, foco y teclado. Ego Lite recorrió creación, edición, eliminación, cambio de rol, vistas y validación del formulario.

Evidencia en `.test-artifacts/ui-lab/agenda-polish/`, scripts en `review/agenda-polish/` y registro `docs/work-log/2026-11-15-root-ui-lab-agenda.md`. El contraste medido sobre fondos sólidos no equivale a certificación WCAG. El HTML sigue abriendo sin servidor. Eventos simples de 2026 y datos compartidos entre roles de demostración; no acredita privacidad real ni persistencia de servidor. Sin cambios productivos.

## Décima iteración · Resolver, entregar y acompañar

**Estudiante:** consulta breve con consigna y criterios visibles; espacio dedicado para resolver, una pregunta por vez y acciones persistentes. El índice identifica respuestas pendientes. La revisión permite saltar a cualquier respuesta y volver a editarla antes de confirmar. Para TP se seleccionan y preparan archivos, se agrega un comentario y se confirma la entrega. El comprobante distingue recepción de calificación. En escritorio de poca altura se compactan espaciados para mostrar las tres opciones del ejemplo sin mover la pantalla.

**Docente:** trabajo entregado y evaluación en dos columnas; respuestas de cuestionario consultables de a una. Rúbrica y nota / Devolución separan las tareas sin perder cambios. Validar abre la sección y enfoca el campo que falta. Guardar conserva la corrección privada; la vista previa y la confirmación publican la versión guardada. El estudiante consulta el detalle de la rúbrica en un diálogo.

**Idea para Foxy:** al elegir IA en Alcance aparece “¿Qué te gustaría que haga tu grupo?”. Es obligatoria, incluye ejemplos orientadores, conserva el texto en el borrador y se puede editar después. Cambiarla señala que la propuesta está desactualizada. La simulación adapta objetivo, consigna y rúbrica; el texto privado no se publica. La creación manual no exige este campo.

**Estados y precisión visual:** errores en rojo y éxitos en verde, con texto e icono que explican el resultado. El fallo del plan ahora dice “No pudimos preparar el plan” y aclara que se conservó el programa. Fallar al guardar mantiene el aviso de error y no muestra un éxito posterior. Contadores centrados para 0, 4 y 12: diferencia de centro de la cápsula 0 px; diferencia del texto 0,5 px.

Fuentes nuevas: `participation.js/css`, `grading-polish.css`, `semantic-feedback.css`; ajustes en autoría, corrección, persistencia de la maqueta y build. Verificación: 82 comprobaciones de navegador, contrato VM de idea docente, 96 combinaciones de pantallas/tamaños y 2486 muestras de contraste CSS sin fallos. Incluye 20 comparaciones de preservación de Inicio, Mis aulas, Plan, Biblioteca y Progreso; navegación por teclado, textos largos y errores de guardado. Evidencia: `.test-artifacts/ui-lab/participation-polish/`; scripts: `review/participation-polish/`. Ego Lite recorrió contexto docente, propuesta/rúbrica, resolución, revisión sin confirmar y mesa de devolución.

El HTML sigue abriendo sin servidor. Generación, archivos, entregas y notas son demostraciones locales; no acreditan proveedor IA, persistencia de servidor ni permisos reales. No se modificó la aplicación productiva.

## Novena iteración · Autoría visual, plan y biblioteca conectados

El aula usa una **cabecera compacta** con miniatura, grupo, cantidad de estudiantes, pendientes y avance del plan. Los contadores llevan a su sección. En escritorio ocupa 126 px; la navegación mantiene todas las secciones visibles también en móvil. Se ajustaron grillas, etiquetas, títulos largos y alineaciones sin cambiar Inicio ni Mis aulas.

**Crear y revisar:** se conservan Alcance → Contenido → Revisión. Contenido ahora se divide en Consigna, Preguntas y Rúbrica, con estado de preparación por sección. El índice permite editar una pregunta o criterio a la vez. “Leer propuesta” presenta el trabajo completo; cada botón Editar vuelve al elemento correspondiente. La rúbrica muestra su total, advierte pesos incompletos o excedidos y permite repartirlos por igual. Los borradores siguen siendo privados y la publicación exige confirmación.

**Plan:** cada tema conserva su estado Dado/Pendiente de manera independiente y reversible. Elegirlo muestra los materiales del tema y de toda su unidad, además de las actividades que lo incluyen. Los cambios actualizan también el contador de la cabecera. Los temas sin recursos tienen un estado vacío explícito.

**Biblioteca:** Archivo y detalles → Organización. Selector de archivo con PDF, Word, PowerPoint y otros formatos comunes declarados, límite de 20 MB y validación de archivos vacíos/no admitidos. Unidad, tema y actividades son opcionales; se puede vincular el recurso a varias actividades o dejarlo sin relaciones. Preparar muestra feedback y conserva los datos al volver; sólo Publicar material agrega la ficha. Buscar, filtrar, consultar y cerrar conserva contexto y foco. La maqueta guarda metadatos locales, no los bytes originales.

**Progreso:** entregas recibidas y pendientes, avance del plan, barras por actividad, distribución de notas publicadas y acceso al recorrido de cada estudiante. Los cálculos usan los datos del prototipo, incluyen la nota cero y excluyen correcciones privadas. Estudiante ve su propio resumen, devoluciones y avance del programa. No se inventan tendencias ni umbrales de aprobación. Aulas sin actividades, personas o notas muestran estados vacíos.

Fuentes: `teaching-room.js/css`, `teaching-library.js/css`, `activity-authoring.js/css`, ajuste de relaciones en `learning-model.js` e integración en core/events/build. Se reutilizan miniaturas existentes; los gráficos se dibujan con CSS/SVG. No se modifica aplicación productiva.

Verificación local: **119 comprobaciones** (3 contratos, 42 recorridos nuevos, 33 regresiones de actividades/entregas/devoluciones, 29 controles de calidad y 12 casos de datos), **220 combinaciones de pantallas y anchos** entre 320 y 1440 px, incluidas 50 con textos largos. Sin desbordes, superposiciones medidas ni errores JS al finalizar. **8816 muestras de contraste CSS** sin fallos bajo el cálculo de fondos sólidos; no es una certificación WCAG. La comparación de Inicio/Mis aulas en 16 combinaciones no detectó cambios. Teclado, foco, publicación y HTML autocontenido comprobados. Ego Lite recorrió edición contextual, rúbrica, selección/preparación de archivo TXT y relaciones opcionales, descarte protegido, marcar/restaurar tema y progreso por rol.

Durante QA se corrigieron una pantalla en blanco cuando no existían actividades, etiquetas móviles pequeñas y un título largo demasiado comprimido. Evidencia local en `.test-artifacts/ui-lab/teaching-polish/`, scripts en `review/teaching-polish/` y registro `docs/work-log/2026-11-15-root-ui-lab-teaching-polish.md`. El archivo de entrega abre directamente por `file://`. IA, publicación y carga son demostraciones locales; no acreditan servidor, procesamiento documental real, seguridad de permisos ni proveedor de IA.

## Octava iteración · Dentro del aula y actividades

La zona horaria ahora se presenta como información visible. No se utilizan disclosures ni acordeones. El interior del aula continúa el lenguaje del Inicio: cabecera ilustrada, superficies durazno/menta/cielo, navegación por secciones, unidades y temas claramente separados. En móvil, “Tema” abre un selector para cambiar de tema sin desplazar primero todo el mapa del plan.

**Crear una actividad:** Alcance → Contenido → Revisión. Se eligen uno o varios temas, o unidades completas; Trabajo práctico, Cuestionario o Evaluación; preparación manual o con Foxy. La propuesta simulada incluye consigna, preguntas abiertas y rúbrica editable. El editor también permite preguntas de opción única o múltiple, pistas, puntajes y criterios ponderados que deben sumar 100%. Los borradores se guardan por aula y no aparecen en la lista estudiantil. Sólo la confirmación final comparte la actividad.

**Consultar y entregar:** ficha propia por actividad, con consigna, temas, criterios y acción según rol/estado. El estudiante responde una pregunta a la vez o selecciona archivos, los prepara, revisa y confirma la entrega. El comprobante conserva sus respuestas y muestra la recepción separada de la devolución. Los archivos son simulados: se guarda nombre y metadatos, no sus bytes; no se realiza una carga real.

**Acompañar y corregir:** el docente ve entregas filtradas por estado, trabajo enviado y rúbrica. Puede indicar puntajes por criterio, usar una nota orientativa ponderada y escribir fortalezas, mejoras y próximo paso. Guardar mantiene la corrección privada; editarla vuelve a exigir guardado. Publicar requiere confirmación y sólo entonces aparece el resultado del estudiante correspondiente. La nota cero y los promedios se conservan correctamente.

Fuentes: `learning-model.js`, `activity-authoring.js/css`, `learning-experience.js`, `learning-grading.js`, `learning.css`, con integración en core/events/build. Se reutilizan las ilustraciones existentes. Inicio y Mis aulas mantienen sus estilos y dimensiones: 16 comparaciones completas de ambos roles en cuatro anchos, sin diferencias.

Evidencia local: 2 contratos RED→GREEN; 32 comprobaciones de recorridos completas; 64 combinaciones de pantallas y anchos sin desborde, campos sin etiqueta ni avisos sobre el pie fijo; 2932 muestras de contraste CSS sin fallos; 28 controles de preservación, teclado, error/reintento, tipos de actividad y archivo autónomo. Se revisaron además 60 vistas del aula/asistente a 320/390/768/1440. Ego Lite recorrió la selección de temas, tipo y método, generación y revisión editable por `file://`. Scripts reproducibles en `review/learning/`; capturas y JSON locales en `.test-artifacts/ui-lab/learning/`.

Las comprobaciones usan datos sintéticos y guardado local. No prueban backend, carga real, IA real ni seguridad de permisos. El contraste se calcula sobre fondos sólidos; no constituye una certificación WCAG. Los flujos y estados quedan disponibles para revisión del usuario, sin integración productiva.

## Séptima iteración · Mis aulas y creación guiada

Se mantiene la identidad del Inicio para ambos roles: encabezado durazno o menta con una ilustración propia, acción principal y número de aulas activas. Las cards existentes conservan sus estilos. Búsqueda por nombre, materia o grupo y vacíos específicos para Activas, Archivadas y Borradores.

Las invitaciones tienen portada proporcionada, aula/grupo, docente, vigencia y revisión antes de aceptar. “Ahora no” conserva el pendiente; aceptar agrega el aula sin duplicarla y mantiene las otras invitaciones. Datos y fechas de ejemplo, sin envío de correos ni membresías reales.

El asistente conserva cuatro pasos: **Tu aula → El programa → El recorrido → Todo listo**. Datos/portada con vista previa, carga y elección explícita IA/manual, editor de unidades/temas y revisión editable. Las acciones permanecen visibles y el contenido tiene un único scroll. Guardar y salir conserva el paso; retomar actualiza el mismo borrador, y crear lo retira de Borradores y vuelve a Activas. Se corrigieron las diferencias previas de la maqueta con el contrato: programa requerido también en manual, unidades con temas y retorno a la colección. Carpetas de estudio conserva su recorrido anterior.

Fuentes nuevas: `classrooms.css`, `classrooms.js`, `classroom-wizard.js`. Arte generado con la herramienta integrada imagegen: [WebP con transparencia](assets/classroom-world.webp), [original](assets/classroom-world-original.png) y [prompt exacto](assets/classroom-world.prompt.txt). El HTML incluye el WebP optimizado y sigue funcionando sin servidor ni conexión.

Verificación local: 105/105 comprobaciones, 49 capturas en 320/390/768/1024/1440, 2711 muestras de contraste CSS sin fallos; regresión de borradores 2 RED → 2 GREEN; 6/6 controles de flujos compartidos, invitaciones múltiples y error/reintento. Comparación de Inicio/cards en ambos roles a 1440/390/320 sin diferencias; scripts embebidos válidos. Ego Lite recorrió invitación, Escape/foco, programa, Foxy simulado, edición y revisión de creación, directamente por file://. Un título excesivamente comprimido en la revisión a 320 px se corrigió y se volvió a revisar. Evidencia en `.test-artifacts/ui-lab/classrooms/` y scripts en `review/classrooms/`. No se evalúa backend, correo, persistencia productiva ni proveedor real de IA; contraste calculado sobre fondos sólidos, sin certificación WCAG completa.

## Revisión final · Alineaciones de Inicio

Se unificaron márgenes internos, escala de los encabezados y anchos de botones. Los widgets comparten bordes superior e inferior cuando aparecen en dos columnas; las portadas de actividades distribuyen mejor el espacio. Los estados de poco contenido y el apilado móvil conservan alturas naturales. La presentación de las aulas sigue intacta.

Revisión geométrica y capturas en 24 combinaciones (ambos roles a 320/390/520/600/760/768/900/1000/1024/1280/1440/1920): contenido centrado, sin overflow ni recortes detectados; 14 combinaciones en dos columnas con diferencia de 0 px entre encabezados y bases. Home 28/28, estados 10/10, agenda 20/20, contraste CSS sin fallos. Ego Lite verificó alternancia y roles; su captura falló dos veces por navegación pendiente, por lo que la revisión visual usó las capturas del runner aislado. Evidencia y límites: `.test-artifacts/ui-lab/alignment/` y registro de trabajo de alineaciones. Sigue siendo una maqueta, no una certificación de accesibilidad ni cambio productivo.

## Quinta iteración · Tu día, con calma

El widget de ambos roles presenta una fecha ilustrada como hoja de calendario, semana compacta con marcadores de eventos y lista cronológica con horarios separados de las tarjetas. Cada evento conserva su color personal y muestra tipo, icono, título y duración calculada. Los eventos con títulos largos crecen sin recortar contenido; el vacío invita a crear un evento. Se conservan navegación por día, detalle, edición, foco de retorno y creación.

Verificación: 20 comprobaciones focalizadas en ambos roles a 320/390/768/1440; seis colores, duraciones, título largo y vacío. 1920 muestras de contraste CSS sin fallos; prueba existente de color, creación/recarga/edición y vistas de agenda: 10/10. Recorridos con Ego Lite, Enter y Escape. Evidencia en `.test-artifacts/ui-lab/day-widget/`, script `review/day-widget/check.mjs`. La referencia temporal sigue siendo la fecha sintética de la maqueta; no se infieren eventos actuales ni se certifica WCAG completa.

## Cuarta iteración · Widgets de pendientes

Se refinaron los dos widgets señalados por el usuario. Las actividades aparecen lado a lado con portadas proporcionadas, fecha legible y acción junto al estado; se adaptan a filas compactas en contenedores estrechos. Una sola actividad ocupa todo el ancho disponible. Las entregas docentes se agrupan por trabajo y aula, conservando acceso individual y estado de devolución privada. Colores suaves relacionan portadas, encabezados y contenido. El enlace de actividades nombra su destino real: el aula seleccionada.

También se corrigió el salto al encabezado al alternar Entregas/Consultas: se conservan posición y foco. El banner, la agenda y las cards de aulas mantienen su presentación.

Verificación de esta iteración: 28 comprobaciones de Home/formulario/aulas/vacíos en cuatro anchos; 2800 muestras de contraste de texto sobre fondos sólidos sin fallos; 10 comprobaciones de agrupación, destinos, borradores, actividad única y foco. Recorridos reales con Ego Lite y capturas revisadas. Evidencia: `.test-artifacts/ui-lab/widgets/`; script focalizado: `review/widgets/states-check.mjs`. Continúa siendo una maqueta con datos sintéticos y persistencia del navegador, sin cambios en producción ni certificación WCAG completa.

## Tercera iteración · Inicio de ambos roles

Pedido del 14 de noviembre: protagonismo de bienvenida, encabezado integrado en ella, widgets con mayor jerarquía, color de evento seleccionable y conservación de las cards de aulas. Skill aplicada: frontend-design. Dirección y crítica previa registradas en el registro de trabajo de esta iteración.

- **Banner funcional:** fecha, saludo, pendientes y acciones en una sola composición; Foxy con mayor presencia, durazno para docente y menta para estudiante. El saludo se adapta a 44/38/32/30 px según espacio, con foco de navegación y alternativas de estado al completar las actividades.
- **Por acompañar:** filas accionables con identidad, trabajo, aula, recepción y acción escrita. Las devoluciones privadas guardadas indican su estado; consultas abre el aula correspondiente.
- **Tu próximo paso:** actividad destacada con imagen del aula, tipo, entrega y acción; próximas actividades compactas. El estado de borrador usa respuestas guardadas reales de la maqueta. Los widgets crecen con el contenido.
- **Evento personal:** seis colores con nombre, radio nativo, marca de selección y vista previa. Se conserva la selección al guardar, recargar y editar; aparece en Inicio y Mes/Semana/Día. Los eventos anteriores reciben el color correspondiente a su tipo como valor inicial. La leyenda identifica colores, sin confundirlos con categorías.
- **Aulas:** generador y CSS anteriores preservados; comparación de estilos computados y dimensiones en ambos roles y cuatro anchos sin diferencias.

Verificación: prueba de color con RED inicial y 10 comprobaciones GREEN; 108/108 comprobaciones generales de layout; 28/28 comprobaciones focalizadas de Inicio, formulario, aulas y vacíos; 2756 muestras de texto en 32 combinaciones de pantalla/ancho/color, sin fallos bajo el cálculo de fondos sólidos. Ego Lite: navegación a actividad/corrección/consulta, creación y edición de color, flechas del teclado y cierre con Escape. Un error inicial al renderizar Inicio estudiante fue detectado, corregido y vuelto a verificar. Evidencia local en `.test-artifacts/ui-lab/home-polish/`; scripts reproducibles en `review/home-polish/`. Los resultados no certifican WCAG completa ni persistencia de la app real.

## Segunda iteración · 14 de noviembre

Se aplica la devolución del usuario sobre contraste débil, componentes que se pierden sobre blanco y una identidad todavía poco expresiva. Continúa el mismo artefacto y el mismo worktree; la referencia Apple se interpreta como claridad de capas, tipografía firme y controles precisos, conservando la identidad educativa de FoxMind.

- **Superficies:** fondo gris azulado `#edf0f4`, tinta `#202c3d`, texto secundario `#47566a` y bordes perceptibles. Controles, estados seleccionados y tarjetas se distinguen sin depender de sombras.
- **Bienvenida:** composición con Foxy, papel, lápiz y órbitas; contexto del aula o próxima entrega junto a la acción. Versión menta para estudiante y estudio; versión durazno para docente. Los motivos se apartan del texto y las acciones en celular.
- **Agenda:** celdas delimitadas, fines de semana diferenciados, fecha seleccionada con borde y número, etiquetas de eventos con hora en escritorio y marcadores en móvil. Resumen diario azul profundo con texto claro, calendario ilustrado, eventos con categoría escrita y color consistente.
- **Flujo móvil de agenda:** elegir un día lleva a sus eventos; “Elegir otro día” devuelve el foco al calendario. Se respeta movimiento reducido. Las vistas Mes/Semana/Día y los formularios mantienen los mismos datos.
- **Componentes compartidos:** botones y estados activos con mayor contraste, cards de aula con portada y affordance de apertura, agenda del inicio con filas diferenciadas, mensajes y herramientas de estudio más legibles.

Verificación de esta iteración: **108/108** comprobaciones generales de layout; **34/34** comprobaciones de vistas/selección/diálogo/bienvenida; **2142 muestras de texto en 15 pantallas × 3 anchos**, sin muestras por debajo del umbral aplicado tras corregir tres combinaciones (4.38:1 inicialmente). El cálculo usa colores CSS sobre fondos sólidos compuestos; no certifica contraste sobre imágenes ni todos los estados ni WCAG completa. Capturas en 320/390/768/1440 y recorridos Ego Lite revisados. Evidencia: `.test-artifacts/ui-lab/iteration-2/`; scripts: `review/iteration-2/`.

Taste inspector: **0 FAIL, 3 WARN**. Se conservan deliberadamente bordes más visibles por el pedido de separación, durazno por la identidad solicitada y saludo móvil de 29 px por legibilidad; son discrepancias con heurísticas estéticas, no fallos ocultados. No se amplía alcance productivo ni se reinician los datos locales que el usuario haya probado.

## Brief y criterio de diseño

Pedido vigente del 13 de noviembre: auditar ambos roles y explorar una interfaz educativa alegre, legible, redondeada, naranja y pastel; reducir scroll innecesario y confusión; usar imágenes proporcionadas y feedback de espera comprensible. La autorización es para esta maqueta, no para trasladarla a producción.

**Dirección:** Humanist Companion; referencia compositiva editorial-greeting de taste-skill, seed 938148012, adaptada al brief. El naranja y las ilustraciones solicitados prevalecen sobre el límite cromático y la prohibición genérica de banners de esa referencia. La recomendación automática inicial de UI/UX Pro Max (claymorphism infantil, índigo, Comic Neue) se descartó por no ajustarse al público ni al pedido; consulta específica educativa y reglas de carga/foco sí aportaron criterios.

**Idea:** el recorrido de aprendizaje de FoxMind se convierte en una secuencia de próximos pasos visibles. El contenido manda; Foxy acompaña la orientación y la espera. Bordes redondeados, sin anidar tarjetas para cada frase. Imágenes en bienvenida y portadas; miniaturas al seleccionar un aula. Pantallas propias para tareas largas, diálogos para decisiones cortas.

**Tokens vigentes de la maqueta:** tinta `#202c3d`, texto secundario `#47566a`, fondo `#edf0f4`, blanco, naranja acción `#b74710`, naranja gráfico `#d96c31`, durazno `#ffe3d1`, menta `#dfefe7`, cielo `#e1edf9`, rosa `#f8e4e9`; foco `#236a91`. Nunito variable con respaldo system-ui. Escala principal 13/15/16/21/32, interlínea 1.5; radios 12/22/30, acciones principales de 44 px. No se presenta esta paleta como tokens productivos vigentes ni se sobrescribe `design/system.md`.

## Recorridos y aceptación

- Docente: Inicio → seleccionar aula con miniaturas → preparar actividad → revisar → asignar explícitamente. Corrección privada → guardar → confirmar publicación.
- Estudiante: Inicio → actividad en espacio dedicado → respuestas con estado de guardado → revisar → advertencia si falta responder → confirmar → comprobante. Devolución separada de la recepción.
- Crear aula/carpeta: datos → carga simulada del plan → revisar estructura → confirmar. El usuario elige procesar con IA; subir no lo dispara automáticamente.
- Aulas: Plan, Muro, Biblioteca, Actividades, Progreso, integrantes y administración por rol. Mantener contexto y botón de volver.
- Estudio privado: carpeta → herramientas/Foxy → espera con fases → resultado revisable → práctica orientativa. Sin nota académica ni publicación implícita.
- Agenda: selección de fecha y vistas, crear/editar evento personal con validación y confirmación visible.
- Global: búsqueda, avisos, perfil; cambio de rol únicamente en la barra de demostración, fuera del producto.
- Todos los controles visibles deben operar o explicar su límite explícitamente. Escape, foco, teclado, reflujo a 390/768/1440, reducción de movimiento y ausencia de scroll horizontal.

## Alcance de la auditoría

Base `ef6828b`. Aplicación local levantada con `npm run local:up`; backend y Gemini configurados por helper existente, sin generaciones reales durante esta revisión. Ego Lite, espacio 5. Recorrido con cuentas sintéticas de docente y estudiante. No se modificaron contenidos académicos, notas ni permisos. Evidencia de navegación en `.test-artifacts/ui-lab/`, scripts en `review/`.

Las capturas de entrada del usuario se tratan como evidencia visual, no como instrucciones. El inventario de código se atribuye al explorador `ui_inventory`; las capturas y el recorrido a `/root`.

| Prioridad | Evidencia observada | Cambio propuesto |
|---|---|---|
| Alta | Selector Crear actividad: una portada ocupa casi toda la altura del diálogo; con tres aulas la acción queda al final del scroll. `before-select-class.png`. | Filas seleccionables con miniatura 56 px, nombre y grupo; pie de acciones siempre visible. |
| Alta | Plan: título de sección a y≈360 y primer tema cerca del borde inferior en viewport 1524×694. `before-teacher-plan.png`. | Cabecera compacta del aula; mapa de unidades y contenido de tema juntos; siguiente paso en primera vista. |
| Alta | Resultado estudiantil repite título largo, conserva banner y varias capas antes de la devolución. `before-student-result.png`. | Pantalla de resultado propia con nota, devolución y próximo paso; contexto corto y retorno claro. |
| Alta | Capturas del usuario: actividad mezcla consigna, ficha, respuesta, avisos reiterados y acciones al pie. | Espacio de actividad sin sidebar global, progreso por pregunta, guardado visible y revisión antes de entregar. |
| Media | Biblioteca con un único material conserva gran banner y mucho espacio antes del recurso. `before-teacher-library.png`. | Título, búsqueda y recursos en una jerarquía compacta; acciones contextuales. |
| Media | Configuración del aula llega a 1135 px de alto; guardar queda fuera de la primera vista. | Formulario por grupos, pie con estado y guardar; acciones de archivo separadas. |
| Media | Foxy y Estudio presentan navegación global, historial y varios niveles de tabs; el texto de ayuda pierde prioridad frente al marco. `before-teacher-foxy.png`, `before-study-workspace.png`. | Una zona de conversación, contexto visible, herramientas y creaciones identificables; historial secundario. |
| Media | Agenda ofrece feedback real de carga pero distribuido en varios paneles; formulario con scroll interior. `before-agenda-form.png`. | Estado dentro de la sección, formulario breve y pie fijo; calendario con resumen diario. |
| Media | Variantes de texto, metadatos y avisos compiten por peso y color marrón/violeta. | Roles cromáticos consistentes y lenguaje por resultado: “Preparando tu plan”, “Guardado”, “Entrega recibida”. |
| Media | Listas vacías conservan filtros que no ayudan a empezar. | Vacío con una acción principal; filtros avanzados sólo si hay elementos. |

**Cobertura real:** Inicio ambos roles; colección; Plan; Muro; Biblioteca; Actividades/lista; Progreso; integrantes; Historial y Configuración docente; Foxy docente; Carpetas y espacio de estudio/materiales; Agenda mes/semana/día/formulario; Perfil/Configuración; devolución publicada. Login y logout ensayados. Creación, entrega nueva, publicación de nota, carga de bytes y generación real no se ejecutaron: se contrastan con código, especificación y capturas suministradas. No es auditoría exhaustiva de seguridad o accesibilidad.

**Incidencias de herramienta:** dos capturas iniciales de Ego Lite fallaron; `Page.bringToFront` recuperó interacción/captura. Un selector Biblioteca fue ambiguo y se corrigió a rol específico. La emulación móvil no persistió en el recorrido inicial: los archivos con nombre `before-mobile-*` devolvieron ancho real 1524, por lo que NO acreditan responsive móvil. La maqueta sí tiene verificación responsive independiente, detallada abajo.

## Verificación de la maqueta

Evidencia local reproducible en `.test-artifacts/ui-lab/`; scripts de revisión en `review/`. Las capturas y JSON son evidencia de este prototipo, no pruebas de la aplicación productiva.

| Comprobación | Resultado y límite |
|---|---|
| Ego Lite, rounds 25–28 | Creación/asignación de actividad; guardar devolución privada y publicar; nota visible después para estudiante; responder y advertir 1 pregunta faltante; comprobante sin campos editables; práctica con orientación; error/reintento conservando datos; crear aula desde plan revisado; validar agenda y código de ingreso. |
| Ego Lite, rounds 29–31 | Nota explícita cero admitida; editar devolución invalida guardado anterior; ruta docente redirige en demo estudiantil; Escape devuelve foco al disparador; 12 Tab consecutivos permanecen en diálogo tras corregir el ciclo de foco. |
| `node design/foxmind-ui-lab/review/layout-check.mjs` | **108/108**: 26 vistas y selector de aula en 1440, 768, 390 y 320 px. Ancho real comprobado, sin desborde de página, H1, etiquetas de campos, imágenes cargadas y pie de acciones dentro del viewport. Sin excepciones de JS ni solicitudes HTTP externas. Se usó movimiento reducido. |
| Taste `inspect.mjs --app` | Inicio en 1440/768/390: **0 FAIL / 0 WARN** en ejecución final. Capturas vistas en escritorio, tablet y celular; no equivale a evaluación con usuarios. |
| Taste `lint.mjs --app` | **0 FAIL**. Advertencias justificadas: sombras sólo en diálogo, toast y navegación superpuesta; `padStart` sólo para fecha ISO. No se suprimieron hallazgos medidos. |
| Artefacto autónomo | Sintaxis de fuentes y scripts embebidos comprobada; tipografía e imágenes incluidas; servidor local rechaza conexiones mediante CSP `connect-src 'none'`. No hay integración con API, Gemini ni secretos. |

Correcciones de revisión: texto móvil bajo 11 px ampliado; filas del inicio alineadas y acción útil al pie de agenda; índice móvil del plan convertido en selector de temas; compositor de Foxy visible con conversación desplazable; indicadores del día actual separados de sus puntos de eventos; foco cíclico en diálogos. La navegación de secciones del aula usa desplazamiento horizontal deliberado en móvil; el resto de la página no desborda.

## Límites y siguiente decisión

- Es una **propuesta de UX/UI**, no una réplica funcional completa. Usa fotografía como contenido ilustrativo; los editores de preguntas, rúbricas, historial, invitaciones y perfiles representan casos seleccionados, no todas las variantes del dominio.
- El guardado es local y compartido entre los roles de demostración para recorrer entrega/devolución. No demuestra autorización, privacidad efectiva, persistencia de servidor ni concurrencia real.
- Carga de archivos y generación están simuladas. Descargar entrega un TXT de ejemplo. Configuración de credenciales sólo explica su límite; no solicita contraseñas.
- No se rediseñaron registro, recuperación de cuenta ni administración operativa. No se ejecutó una auditoría WCAG completa, lector de pantalla o pruebas con personas; tampoco API/web build o suite de producción, ya que no se modificó código de aplicación.
- La app real usada para auditar se detuvo con `npm run local:stop`; datos y volúmenes se conservaron. La vista estática queda disponible en 4173.
- Próximo paso: revisión del usuario sobre dirección visual y recorridos. Tras acordarlos, definir un alcance de implementación productiva por unidades. Esta maqueta no autoriza esa implementación, commits ni despliegues.

## Referencias

- [Frontend design de Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): decisiones visuales específicas del producto, jerarquía y copy por acción; consultada, sin instalar.
- Assets: ilustraciones y portadas existentes en `apps/web/public/foxmind-3d`, marca existente de FoxMind. Las dos fotos de perfil demo se generaron con Imagegen en la iteración 13; sus prompts y originales están en assets. No se atribuyen resultados reales a los ejemplos.
- [Nunito, Google Fonts](https://github.com/google/fonts/tree/main/ofl/nunito), licencia SIL Open Font License incluida en assets.

Estado: maqueta construida y verificada localmente; pendiente de revisión de diseño por el usuario.


## Iteración 17 · auditoría integral y plan de implementación

Maqueta final auditada para ambos roles. Se corrigieron aislamiento entre aulas, navegación por recurso, guardados fallidos, consultas de Inicio, entregas en aulas archivadas y mensajes de otro rol. Se conserva la dirección visual aprobada.

- [Auditoría final y límites](FINAL-AUDIT.md).
- [Plan de paridad para frontend/backend](IMPLEMENTATION-PLAN.md).
- [Identidad del HTML y verificaciones](verification-final.json).

Evidencia del candidato: 31 suites, 170 variantes responsive, 8.744 muestras de contraste, 46 controles independientes y 24 regresiones focalizadas correctos. HTML autónomo `01-foxmind.html`, sin servidor. El producto real todavía no fue implementado ni publicado.
