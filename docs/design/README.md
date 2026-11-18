# Experiencia de usuario de FoxMind

Esta guía describe el candidato de paridad del 15 de noviembre y su refinamiento visual posterior. Las acciones dependen de la cuenta, el contexto y los permisos del recurso. La referencia aprobada define la dirección visual; el registro distingue implementación y comparación en navegador. [Referencia aprobada](../../design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md) · [Refinamiento vigente](../work-log/2026-11-15-root-visual-fidelity.md) · [Galería histórica](current/README.md)

## Navegación e Inicio

Por encima de 1000 px, la barra lateral privada puede quedar expandida (232 px) o plegada a iconos (76 px). La elección se guarda en el navegador. En anchos menores, el menú compacto devuelve el foco al control de origen al cerrarse. Ambos roles tienen Inicio, Mis aulas, Agenda, búsqueda, Notificaciones y acceso directo a Mi perfil. Foxy AI aparece para docentes y Mi estudio para estudiantes. «Tus aulas» muestra hasta tres accesos con puntos de color y nombres completos, tanto en la barra expandida como al abrir el menú móvil. Dentro del chat móvil, el menú se integra en su barra de contexto.

Inicio abre con un saludo ilustrado, fecha local y acciones según el rol. El docente alterna entregas agrupadas por actividad y consultas, y confirma el aula al crear una actividad. El estudiante encuentra pendientes y acceso a Mi estudio. Ambos roles tienen una agenda del día y tarjetas de aulas. El contenido se centra con un máximo de 1200 px. No se agregan bloques de borradores, devoluciones recientes, control de orden ni un pie de próximo tema: la corrección vigente exige conservar sólo los componentes de la maqueta. En móvil, el plazo de una entrega estudiantil queda debajo del título. [Reglas de Inicio](../engineering/home/README.md) · [Capturas anteriores](current/README.md#inicio-búsqueda-y-notificaciones)

## Mis aulas

| Rol | Secciones |
|---|---|
| Docente | Plan, Muro, Biblioteca, Actividades, Progreso, Estudiantes, Historial y Ajustes |
| Estudiante | Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros |

El catálogo tiene bienvenida ilustrada y tarjetas; el interior usa una cabecera compacta con miniatura y accesos a pendientes y temas trabajados. Plan presenta un listado lateral de unidades y el tema seleccionado con sus materiales y actividades. En móvil, Elegir tema abre un diálogo y evita repetir ese listado. Marcar como dado permanece en la cabecera del tema. Biblioteca permite revisar descripción, organización y vínculos antes de publicar. Progreso docente muestra entregas por actividad, distribución de notas publicadas y recorrido individual; no infiere estados privados que su proyección no expone. Mi progreso muestra avance y devoluciones publicadas con una gráfica circular. [Reglas de Aulas](../engineering/classrooms/README.md) · [Capturas anteriores](current/README.md#mis-aulas)

### Crear y entrar

Crear aula y Crear carpeta comparten cuatro pasos, rail de progreso, vista previa, tres portadas principales y alternativas adicionales, revisión editable y acciones visibles al desplazar. Los datos, permisos y mensajes son propios de cada dominio. Estudio permite vincular un aula en El programa, importar su plan y editar la copia. Guardar y salir permite volver desde Borradores. El aula se crea al confirmar. El estudiante que se une por código revisa el destino y confirma la inscripción. Puede aceptar o rechazar una invitación desde Mis aulas o al abrir su aviso. [Capturas anteriores de los asistentes](current/README.md#creación-e-ingreso)

### Actividades y devolución

Crear actividad abre directamente el espacio enfocado Alcance → Contenido → Revisión. El primer paso reúne temas o unidades, tipo y modo manual/Foxy. La generación requiere la idea docente y abre su resultado como borrador privado editable. Lectura y resolución mantienen una cabecera compacta y acciones inferiores; el cuestionario presenta una pregunta a la vez. El estudiante puede volver a editar desde la revisión. La confirmación emite un comprobante compacto y permite consultar lo entregado. La corrección docente prioriza trabajo, rúbrica y devolución; la sugerencia de Foxy se abre a demanda y no genera al abrir la pantalla. Sólo publicar revela la versión revisada al estudiante. [Autoría](../engineering/activities/authoring.md) · [Participación](../engineering/activities/participation.md) · [Calificación](../engineering/grading/README.md)

## Foxy y Carpetas de estudio

El chat ocupa el espacio disponible y reúne contexto, historial, herramientas, creaciones y biblioteca en una barra compacta. Nuevo chat tiene etiqueta visible. Los paneles conservan el borrador. Los mensajes muestran el avatar o las iniciales de la cuenta y el avatar de Foxy. La espera distingue envío, cola y procesamiento. En el chat general docente sin fuentes, el texto de una respuesta compatible aparece por partes. Detener conserva el foco mientras crece el texto. Cuando se cancela una operación, el chat retira el parcial y muestra el estado confirmado.

| Superficie | Docente | Estudiante |
|---|---|---|
| Contexto | Elige General, aula completa o un conjunto acotado de temas y fuentes | Trabaja en su carpeta, elige temas y consulta la procedencia de las fuentes |
| Adjuntos | Incorpora PDF, DOC, DOCX, PPT o PPTX privados, con un máximo de seis archivos y 20 MB acumulados | Puede guardar además una copia como material de carpeta mediante una elección explícita |
| Herramientas | Ofrece Preparar un apunte, Imágenes y esquemas, Crear una actividad, Planificar una clase y Pensar una rúbrica; cada propuesta exige una idea y revisión | Ofrece Entender un tema, Preparar un apunte, Conectar ideas, Practicar, Preparar una evaluación y Organizar mi repaso |
| Creaciones | Lee, edita y descarga. Compartir abre los pasos de Biblioteca o el traspaso a un borrador de TP | Lee y descarga recursos privados. Las prácticas incluyen consignas descargables y devolución al finalizar |

Materiales y Plan ofrece filtros, procedencia, compatibilidad con Foxy, apertura y descarga. Estudiar prepara una consulta para un tema. Abrir un DOCX muestra el texto disponible y Descargar conserva el original. Quitar material, eliminar carpeta y agregar sesiones a Agenda abren confirmaciones dentro de FoxMind. Cancelar o Escape conserva el contexto y devuelve el foco. [Foxy](../engineering/ai/foxy.md) · [Estudio](../engineering/study/README.md) · [Capturas anteriores](current/README.md#foxy-y-carpetas-de-estudio)

Mi estudio separa Activas y Borradores. Crear carpeta recorre identidad (nombre, materia, año y portada), programa, unidades y temas, y revisión. Guardar y salir conserva el paso para retomarlo. El historial permite renombrar conversaciones sin alterar sus mensajes. Practicar presenta una pregunta por pantalla, permite revisar respuestas y exige confirmar antes de finalizar. Organizar mi repaso permite revisar las sesiones antes de agregarlas a Agenda. La fidelidad del candidato del 16 de noviembre se registra en [la tarea de Foxy y Mi Estudio](../../odd/tasks/foxy-study-exact-parity.md); las capturas anteriores sólo acreditan su propio candidato.

## Agenda

Mes es la vista inicial en escritorio y móvil; Mes, Semana y Día comparten la fecha seleccionada. Un enlace explícito puede abrir otra vista. El panel de Mes se muestra a la derecha en escritorio y debajo del calendario en pantallas angostas; al elegir una fecha, el foco llega al panel. Las fichas de las tres vistas reúnen hora, tipo y color. El detalle y su confirmación se abren sobre el calendario. El editor presenta categorías reales como tarjetas, fecha/horas, repetición y anticipación del aviso; la vista previa muestra azul, verde, naranja, rosa, violeta o pizarra. Los eventos antiguos conservan sus colores adicionales. Los repasos confirmados desde Estudio enlazan al examen y a su carpeta. [Reglas de Agenda](../engineering/agenda/README.md) · [Registro de paridad](../work-log/2026-11-16-root-agenda-exact.md) · [Capturas anteriores](current/README.md#agenda)

## Notificaciones

El centro de ambos roles muestra los totales de la cuenta, filtros por lectura y tipo y avisos agrupados por fecha. En celular, el texto y las acciones se distribuyen en filas separadas y los controles conservan un área táctil cuadrada. La lectura se puede revertir y conserva las páginas abiertas. Si una lectura ya se guardó y falla la actualización de la bandeja, se conserva la confirmación y aparece un reintento de consulta.

Los avisos de Agenda y de invitación abren su detalle sobre la bandeja; cerrar devuelve el foco a la acción de origen o al filtro activo cuando la fila ya no se muestra. Revisar una invitación no inscribe al estudiante. El aviso de un recurso retirado presenta una explicación en rojo sin navegar al destino. [Reglas de la bandeja](../engineering/home/README.md#bandeja-unificada) · [Registro de paridad](../work-log/2026-11-16-root-notifications-exact.md)

## Perfil y configuración de cuenta

El selector ofrece iniciales y cuatro avatares Foxy. Guardar cambios aplica nombres y avatar juntos. En móvil, las iniciales ocupan una fila y los avatares se distribuyen en dos columnas. Configuración contiene contraseña y cierre de sesión. [Identidad](../engineering/identity/README.md) · [Capturas anteriores](current/README.md#cuenta-y-acceso)

## Componentes y estados

El candidato usa Nunito en el espacio privado, superficies claras, navegación compacta y portadas ilustradas. La base compartida define colores y tipografía junto con los controles y estilos de cada vista. [Base de paridad](../../apps/web/src/application/shell/styles/parity-foundation.css) · [Controles Brújula](../../apps/web/src/application/shell/styles/brujula-controls.css)

| Elemento | Implementación |
|---|---|
| Selector Activas, Archivadas y Borradores | [CollectionStateFilter](../../apps/shared-ui/CollectionStateFilter.tsx) |
| Navegación y chat | [AppNavbar](../../apps/shared-ui/AppNavbar.tsx) y [FoxyChatLayout](../../apps/shared-ui/FoxyChatLayout.tsx) |
| Herramientas y espera | [FoxyToolPicker](../../apps/shared-ui/FoxyToolPicker.tsx) y [AsyncFeedback](../../apps/shared-ui/AsyncFeedback.tsx) |
| Posición de lectura y mensajes nuevos | [useChatFollow](../../apps/shared-ui/use-chat-follow.ts) |
| Pasos, portadas y revisión | [CreationSteps](../../apps/shared-ui/CreationSteps.tsx) y [estilos del asistente](../../apps/web/src/features/classrooms/styles/brujula-wizard.css) |
| Carga de programa y análisis al crear aula | [ClassroomProcessing](../../apps/web/src/features/classrooms/creation/ClassroomProcessing.tsx), estados reales e indeterminados; [comparación con UI Lab](../verification/product-parity/classrooms-collection/README.md#carga-del-programa-y-análisis-de-foxy) |
| Confirmaciones de Estudio | [StudyConfirmation](../../apps/web/src/features/study/ui/study-confirmation.tsx) |

Los estados de carga y guardado indican la operación. Un vacío explica qué falta y ofrece la acción permitida. Los errores recuperables conservan los datos ingresados. Para verificar un cambio, comprobá foco, teclado, contraste, tamaño de controles, movimiento reducido y ajuste al ancho real. [Evidencia](../verification/README.md) · [Política documental](../documentation-policy.md)
