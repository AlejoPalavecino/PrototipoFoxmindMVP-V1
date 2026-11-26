# Experiencia de usuario de FoxMind

Esta guía describe la experiencia en `main` al 18 de noviembre de 2026, más el piloto Expedición del 24 de noviembre (acceso, barra lateral e Inicio), todavía sin integrar. Las acciones dependen de la cuenta, el contexto y los permisos del recurso. La galería recorre la aplicación compilada con cuentas sintéticas. Las comparaciones con UI Lab documentan las decisiones que dieron origen a la interfaz. [Galería vigente](current/README.md) · [Referencia aprobada](../../design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md)

La [maqueta HTML interactiva](../../design/foxmind-ui-lab/01-foxmind.html) incluye el semáforo propuesto en Inicio docente y las fichas en Aula → Estudiantes. [Recorrido y reglas](../product/acompanamiento-docente-propuesta.md).

## Lenguaje visual Expedición

Expedición reemplaza a Brújula en el acceso, la barra lateral privada e Inicio. Es un piloto: si convence, se migran las demás pantallas. Mientras tanto, Mis aulas, Agenda, Foxy, Mi estudio, Notificaciones y Perfil conservan su contenido en Brújula y comparten la barra lateral Expedición. [Tablero](../../odd/tasks/expedition-visual.md) · [Maquetas aprobadas](../../design/auth-home-refresh/expedicion.html)

| Decisión | Cómo aplicarla |
|---|---|
| Color y contraste | Paleta de valle definida en [`expedition-tokens.css`](../../apps/web/src/application/shell/styles/expedition-tokens.css): lago `#1b3a52` para la navegación y la selección activa, pino `#1d6b57`, cielo `#d6ebf7`, niebla `#edf3f0`, sol `#ffc94d`, sendero `#d9a66b` y violeta `#6d5bd0`. El naranja de marca `#e8590c` es decorativo (paradas, barras, puntos). Detrás de texto blanco usá `#c4490a` (4,88:1), y para texto naranja sobre blanco, `#b8420a` (5,49:1). Sobre el lago, el texto de navegación `#c4d6e4` da 7,94:1 y las etiquetas `#93b0c6`, 5,22:1. |
| Tipografía y jerarquía | Nunito en toda la app, incluido el acceso. Títulos en peso 900 y texto de apoyo en 600. Expedición no agrega fuentes. |
| Ilustración | Los paisajes pintados de cada rol (atardecer con cerros para docente y río para estudiante) y el zorro plano `foxy-bienvenida` son decorativos: `aria-hidden` y `alt` vacío. El zorro está parado sobre el camino del paisaje y puede decir una frase o lo más urgente en una burbuja. |
| Sendero | El recorrido se dibuja con paradas (círculos con aro) unidas por un trazo punteado: los pasos del registro, el recorrido del día y las actividades de Inicio. Usá este motivo sólo cuando el contenido sea una secuencia o una lista de pasos. |
| Foco | Sobre superficies claras, contorno azul `#2463c9`. Sobre el lago, contorno sol `#ffc94d` de 3 px (al menos 3:1). |

Cada variante de componente debe verificarse sobre su superficie real y en la app, no sólo en la maqueta: las hojas Brújula todavía cargadas pueden ganar por especificidad. [Cómo se cargan los estilos](../engineering/frontend/README.md#composición-y-contratos) · [Capturas](current/README.md)

## Acceso

Iniciar sesión, Crear cuenta, Verificar correo, Recuperar acceso y Nueva contraseña muestran el paisaje a pantalla completa con el formulario en una tarjeta. Arriba hay un acceso para pasar entre ingresar y registrarse. El zorro guía tiene una frase por vista; en celular asoma detrás de la tarjeta.

Crear cuenta se recorre en tres paradas:

1. **Tu rol.** Tarjetas con avatar y qué puede hacer cada rol. No se avanza sin elegir uno y se aclara que el rol es permanente.
2. **Tus datos.** Muestra el rol elegido con la opción Cambiar. Volver conserva lo escrito.
3. **Tu correo.** Después de un envío aceptado aparece «Revisá tu correo» con la dirección y los pasos siguientes.

El envío y sus validaciones son los del contrato de identidad. Los textos del acceso usan voseo y el rol se llama Estudiante. [Identidad](../engineering/identity/README.md) · [Capturas](current/README.md#cuenta-y-acceso)

## Navegación e Inicio

La barra lateral privada usa el lago de Expedición en toda la app. La sección actual va en blanco con una marca naranja. Saldo de IA, Ayuda y cuenta quedan juntos al pie, y Ayuda es una fila que abre el diálogo de orientación. Por encima de 1000 px, la barra puede quedar expandida (232 px) o plegada a iconos (76 px). La elección se guarda en el navegador. En anchos menores, el menú compacto devuelve el foco al control de origen al cerrarse. Ambos roles tienen Inicio, Mis aulas, Agenda, búsqueda, Notificaciones y acceso directo a Mi perfil. Foxy AI aparece para docentes y Mi estudio para estudiantes. «Tus aulas» muestra hasta tres accesos con puntos de color y nombres completos, tanto en la barra expandida como al abrir el menú móvil. Dentro del chat móvil, el menú se integra en su barra de contexto.

Inicio abre con el banner pintado del rol, la fecha local, el saludo y las acciones. Debajo del resumen, el recorrido muestra como mucho tres eventos o entregas que quedan hoy, y se oculta si no hay ninguno. La burbuja del zorro indica lo más urgente: la primera entrega para revisar o la primera actividad abierta con su cierre. Cada actividad docente muestra «X de Y corregidas», cada actividad del estudiante con preguntas muestra cuántas respondió, y las aulas son destinos circulares con el avance del plan. El docente alterna entregas agrupadas por actividad y consultas, puede ordenar cada lista y confirma el aula al crear una actividad. El estudiante encuentra pendientes y acceso a Mi estudio. Ambos roles tienen una agenda del día y tarjetas de aulas. El contenido se centra con un máximo de 1200 px. En móvil, el plazo de una entrega estudiantil queda debajo del título. [Reglas de Inicio](../engineering/home/README.md) · [Capturas](current/README.md#inicio-búsqueda-y-notificaciones)

## Mis aulas

| Rol | Secciones |
|---|---|
| Docente | Plan, Muro, Biblioteca, Actividades, Progreso, Estudiantes, Historial y Ajustes |
| Estudiante | Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros |

El catálogo tiene bienvenida ilustrada y tarjetas. El interior usa una cabecera compacta con miniatura y accesos a pendientes y temas trabajados. Plan presenta un listado lateral de unidades y el tema seleccionado con sus materiales y actividades. En móvil, Elegir tema abre un diálogo. Marcar como dado permanece en la cabecera del tema. Biblioteca permite revisar descripción, organización y vínculos antes de publicar. Progreso docente muestra entregas por actividad, distribución de notas publicadas y recorrido individual. Mi progreso muestra avance y devoluciones publicadas con una gráfica circular. [Reglas de Aulas](../engineering/classrooms/README.md) · [Capturas](current/README.md#mis-aulas)

### Crear y entrar

Crear aula y Crear carpeta comparten cuatro pasos, indicador de progreso, vista previa, tres portadas principales y alternativas adicionales, revisión editable y acciones visibles al desplazar. Los datos, permisos y mensajes son propios de cada dominio. Estudio permite vincular un aula en El programa, importar su plan y editar la copia. Guardar y salir permite volver desde Borradores. El aula se crea al confirmar. El estudiante que se une por código revisa el destino y confirma la inscripción. Puede aceptar o rechazar una invitación desde Mis aulas o al abrir su aviso. [Capturas de los asistentes](current/README.md#creación-e-ingreso)

### Actividades y devolución

Crear actividad abre directamente el espacio enfocado Alcance → Contenido → Revisión. El primer paso reúne temas o unidades, tipo y modo manual/Foxy. La generación requiere la idea docente y abre su resultado como borrador privado editable. Lectura y resolución mantienen una cabecera compacta y acciones inferiores; el cuestionario presenta una pregunta a la vez. El estudiante puede volver a editar desde la revisión. La confirmación emite un comprobante compacto y permite consultar lo entregado. La corrección docente prioriza trabajo, rúbrica y devolución; la sugerencia de Foxy se abre a demanda y no genera al abrir la pantalla. Sólo publicar revela la versión revisada al estudiante. [Autoría](../engineering/activities/authoring.md) · [Participación](../engineering/activities/participation.md) · [Calificación](../engineering/grading/README.md)

## Foxy y Carpetas de estudio

El chat ocupa el espacio disponible y reúne contexto, historial, herramientas, creaciones y biblioteca en una barra compacta. Nuevo chat tiene etiqueta visible. Los paneles conservan el borrador. Los mensajes muestran el avatar o las iniciales de la cuenta y el avatar de Foxy. La espera distingue envío, cola y procesamiento. En el chat general docente sin fuentes, el texto de una respuesta compatible aparece por partes. Detener conserva el foco mientras crece el texto. Cuando se cancela una operación, el chat retira el parcial y muestra el estado confirmado.

| Superficie | Docente | Estudiante |
|---|---|---|
| Contexto | Elige General, aula completa o un conjunto acotado de temas y fuentes | Trabaja en su carpeta, elige temas y consulta la procedencia de las fuentes |
| Adjuntos | Incorpora PDF, DOC, DOCX, PPT o PPTX privados, con un máximo de seis archivos y 20 MB acumulados | Puede guardar además una copia como material de carpeta mediante una elección explícita |
| Herramientas | Ofrece recursos de lectura y visuales, ideas de actividades, planes de clase y rúbricas. Cada propuesta exige una idea y revisión | Ofrece ayuda para entender temas, apuntes, esquemas e imágenes, prácticas, preparación de evaluaciones y organización del repaso |
| Creaciones | Lee, edita y descarga. Compartir abre los pasos de Biblioteca o el traspaso a un borrador de TP | Lee y descarga recursos privados, incluidas las imágenes. Las prácticas incluyen consignas descargables y devolución al finalizar |

Materiales y Plan ofrece filtros, procedencia, compatibilidad con Foxy, apertura y descarga. Estudiar prepara una consulta para un tema. Abrir un DOCX muestra el texto disponible y Descargar conserva el original. Quitar material, eliminar carpeta y agregar sesiones a Agenda abren confirmaciones dentro de FoxMind. Cancelar o Escape conserva el contexto y devuelve el foco. [Foxy](../engineering/ai/foxy.md) · [Estudio](../engineering/study/README.md) · [Capturas](current/README.md#foxy-y-carpetas-de-estudio)

Mi estudio separa Activas, Borradores y Archivadas. Crear carpeta recorre identidad (nombre, materia, año y portada), programa, unidades y temas, y revisión. Guardar y salir conserva el paso para retomarlo. El historial permite renombrar conversaciones sin alterar sus mensajes. Practicar presenta una pregunta por pantalla, permite revisar respuestas y exige confirmar antes de finalizar. Organizar mi repaso permite revisar las sesiones antes de agregarlas a Agenda.

## Agenda

Mes es la vista inicial en escritorio y móvil. Mes, Semana y Día comparten la fecha seleccionada. Un enlace explícito puede abrir otra vista. El panel de Mes se muestra a la derecha en escritorio y debajo del calendario en pantallas angostas. Al elegir una fecha, el foco llega al panel. Las fichas reúnen hora, tipo y color. El detalle y su confirmación se abren sobre el calendario. El editor presenta categorías reales como tarjetas, fecha y horas, repetición y anticipación del aviso. La vista previa muestra azul, verde, naranja, rosa, violeta o pizarra. Los eventos antiguos conservan sus colores adicionales. Los repasos confirmados desde Estudio enlazan al examen y a su carpeta. [Reglas de Agenda](../engineering/agenda/README.md) · [Capturas](current/README.md#agenda)

## Notificaciones

El centro de ambos roles muestra los totales de la cuenta, filtros por lectura y tipo y avisos agrupados por fecha. En celular, el texto y las acciones se distribuyen en filas separadas y los controles conservan un área táctil cuadrada. La lectura se puede revertir y conserva las páginas abiertas. Si una lectura ya se guardó y falla la actualización de la bandeja, se conserva la confirmación y aparece un reintento de consulta.

Los avisos de Agenda y de invitación abren su detalle sobre la bandeja; cerrar devuelve el foco a la acción de origen o al filtro activo cuando la fila ya no se muestra. Revisar una invitación no inscribe al estudiante. El aviso de un recurso retirado presenta una explicación en rojo sin navegar al destino. [Reglas de la bandeja](../engineering/home/README.md#bandeja-unificada) · [Registro de paridad](../work-log/2026-11-16-root-notifications-exact.md)

## Perfil y configuración de cuenta

El selector ofrece iniciales y cuatro avatares Foxy. Guardar cambios aplica nombres y avatar juntos. En móvil, las iniciales ocupan una fila y los avatares se distribuyen en dos columnas. Configuración contiene contraseña y cierre de sesión. [Identidad](../engineering/identity/README.md) · [Capturas](current/README.md#cuenta-y-acceso)

## Componentes y estados

Pestañas, calendarios y diálogos ajustan los controles compartidos a cada flujo. [Controles compartidos](../../apps/web/src/application/shell/styles/brujula-controls.css)

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

## Saldo mensual de IA

La barra lateral muestra «Saldo de IA» con el porcentaje disponible y una barra. En la barra plegada queda el porcentaje y, en pantallas angostas, el botón compacto «IA N %». El nombre accesible sigue siendo «IA · N % disponible». Al abrirlo se presentan saldo disponible, límite mensual, consumo imputado, reservas en curso, desglose por herramienta y renovación en hora de Buenos Aires. Escape cierra el diálogo y devuelve el foco al botón. Durante la reconexión el estado indica que el saldo se está actualizando. [Reglas del saldo](../engineering/ai/README.md) · [Capturas](current/README.md#cuota-mensual-de-ia)
