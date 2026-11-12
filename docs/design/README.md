# Experiencia de usuario de FoxMind

Brújula es el sistema visual de la aplicación. La navegación y los componentes compartidos mantienen la misma presentación entre roles. Las acciones dependen de la cuenta, el contexto y los permisos del recurso. [Galería de la aplicación](current/README.md)

## Navegación e Inicio

El escritorio muestra la barra lateral desde 1024 px. En pantallas más estrechas, el menú compacto abre un panel que devuelve el foco al control de origen al cerrarse. Ambos roles tienen Inicio, Mis aulas, Agenda, búsqueda, notificaciones y Mi cuenta. Foxy AI aparece para docentes y Carpetas de estudio para estudiantes.

En Inicio, el docente ordena Entregas y Consultas por separado, elige Aula en foco y confirma el destino de cada acción. El estudiante encuentra sus entregas y devoluciones publicadas. La mini agenda usa tarjetas compartidas con fecha lateral, horario y acceso de 44 px. En móvil, el plazo de una entrega queda debajo del título. [Reglas de Inicio](../engineering/home/README.md) · [Capturas](current/README.md#inicio-búsqueda-y-notificaciones)

## Mis aulas

| Rol | Secciones |
|---|---|
| Docente | Plan, Muro, Biblioteca, Actividades, Progreso, Alumnos, Historial y Configuración |
| Estudiante | Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros |

El catálogo y el interior comparten cabecera, selector de secciones y jerarquía visual. Plan alinea el control de avance con el nombre y el estado de cada tema. En Biblioteca, la búsqueda reserva espacio para la lupa y los recursos conservan su acción de apertura en móvil. Progreso docente usa una tabla de clase. Mi progreso reúne datos propios de la cuenta estudiante. Configuración del aula agrupa portadas en dos columnas en móvil. [Diseño aprobado](classroom-teacher-redesign.md) · [Reglas de Aulas](../engineering/classrooms/README.md) · [Capturas](current/README.md#mis-aulas)

### Crear y entrar

Crear aula y Crear carpeta comparten cuatro pasos, portadas, revisión editable y acciones visibles al desplazar. Los datos, permisos y mensajes son propios de cada dominio. Guardar borrador permite volver desde Pendientes. El aula se crea al confirmar. El estudiante que se une por código revisa el destino y confirma la inscripción. [Asistentes](current/README.md#creación-e-ingreso)

### Actividades y devolución

La autoría manual usa un editor con preparación y revisión. La generación asistida abre el resultado en el editor como borrador privado. El estudiante puede volver a editar desde la revisión de entrega. La confirmación emite el comprobante y bloquea la edición del intento. La corrección docente se guarda en privado y sólo aparece para el estudiante después de publicar la versión revisada. [Autoría](../engineering/activities/authoring.md) · [Participación](../engineering/activities/participation.md) · [Calificación](../engineering/grading/README.md)

## Foxy y Carpetas de estudio

Chat, Herramientas y Creaciones comparten la presentación. Historial es una columna plegable en escritorio y un diálogo en móvil. El chat ampliado conserva el borrador y vuelve con Escape. Los mensajes propios usan el avatar o las iniciales de la cuenta. La espera indica la operación y la demora sin presentar texto parcial generado.

| Superficie | Docente | Estudiante |
|---|---|---|
| Contexto | Elige General o aula propia y aplica el cambio. Puede elegir temas y fuentes del aula | Trabaja en su carpeta, elige temas y consulta la procedencia de las fuentes |
| Adjuntos | Incorpora PDF/DOCX privados de esa conversación | Puede guardar además una copia como material de carpeta mediante una elección explícita |
| Herramientas | Prepara apuntes, esquemas, actividades, planificaciones y rúbricas. La tarjeta Imágenes y esquemas abre su propio diálogo, también desde un chat nuevo | Prepara apuntes, esquemas, quizzes, ejercicios y simulacros. Preparar un examen abre un cronograma revisable |
| Creaciones | Lee, edita y descarga. Compartir abre los pasos de Biblioteca o el traspaso a un borrador de TP | Lee y descarga recursos privados. Las prácticas incluyen consignas descargables y devolución al finalizar |

Materiales y Plan ofrece filtros, procedencia, compatibilidad con Foxy, apertura y descarga. Estudiar prepara una consulta para un tema. Abrir un DOCX muestra el texto disponible y Descargar conserva el original. Quitar material, eliminar carpeta y agregar sesiones a Agenda abren confirmaciones dentro de FoxMind. Cancelar o Escape conserva el contexto y devuelve el foco. [Foxy](../engineering/ai/foxy.md) · [Estudio](../engineering/study/README.md) · [Capturas](current/README.md#foxy-y-carpetas-de-estudio)

## Agenda

Mes, Semana y Día conservan la fecha seleccionada. El detalle se muestra al costado en escritorio y en un panel inferior hasta 920 px. El widget diario aprobado05 usa fecha prominente, conteo compacto y filas ligeras con columna horaria, título completo, tipo/contexto y acento de color existente. Toda la fila abre el evento o la actividad; «Agregar para este día» conserva la fecha elegida. No tiene altura fija ni truncamiento de títulos y conserva la tipografía existente. Se reutiliza en lateral, vista Día y panel inferior; no cambia la mini agenda de Inicio, calendario, toolbar ni Después de este día. Sólo se aplica el widget aprobado en la comparación estática05: no el rediseño completo01/04 ni el formulario de colores del prototipo. La prueba funcional independiente del DOM productivo (`mwe4y7jn-b-4y8r`) confirmó paridad autenticada docente/estudiante y recorridos a 1440/768/390/320 px. El recheck dirigido `mwe5gloj-d-6gwb` confirmó el acento/halo AUTO EVALUATION corregido y Naranja/Dorado intactos a 1440/320 px. Sin capturas nuevas ni nuevo barrido completo; entregas académicas con cobertura unitaria, no observadas en vivo. Se conserva el advisory preexistente de foco BODY al cancelar creación en estudiante320, fuera del widget. Este corte está verificado localmente e integrado/publicado en `main` (widget `558159c`; entrega `b1657a6`). [Evidencia y límites del widget](../work-log/2026-11-12-implementer-agenda-day-widget.md). El formulario pasa a una columna hasta 600 px. En Mes, las celdas ocupan la altura de su fila (86 px; 64 px hasta 600 px); hasta 800 px se conservan los puntos de eventos aunque se oculten sus vistas previas. Los puntos son decorativos y el nombre accesible del día conserva el conteo completo. Este ajuste tiene pruebas estructurales, regresiones y mediciones del build local en Ego Lite entre 320 y 1440 px, sin solapamiento ni desborde horizontal y con puntos móviles visibles. No actualiza la aceptación por capturas ni las imágenes publicadas; el intento de captura falló por timeout. [Evidencia del corte](../work-log/2026-11-12-root-agenda-month-polish.md). [Reglas de Agenda](../engineering/agenda/README.md) · [Capturas](current/README.md#agenda)

## Perfil y configuración de cuenta

El selector ofrece iniciales y cuatro avatares Foxy. Guardar cambios aplica nombres y avatar juntos. En móvil, las iniciales ocupan una fila y los avatares se distribuyen en dos columnas. Configuración contiene contraseña y cierre de sesión. [Identidad](../engineering/identity/README.md) · [Capturas](current/README.md#cuenta-y-acceso)

## Componentes y estados

Brújula usa Lexend, texto #252646, fondo #F4F7FE, superficies blancas y acción #B8490C. El CSS compartido y los estilos de cada pantalla definen el resultado. [CSS principal](../../apps/shared-ui/brujula.css) · [Controles](../../apps/shared-ui/brujula-controls.css)

| Elemento | Implementación |
|---|---|
| Selector Activas, Archivadas y Pendientes | [CollectionStateFilter](../../apps/shared-ui/CollectionStateFilter.tsx) |
| Herramientas y espera | [FoxyToolPicker](../../apps/shared-ui/FoxyToolPicker.tsx) y [AsyncFeedback](../../apps/shared-ui/AsyncFeedback.tsx) |
| Posición de lectura y mensajes nuevos | [useChatFollow](../../apps/shared-ui/use-chat-follow.ts) |
| Pasos, portadas y revisión | [CreationSteps](../../apps/shared-ui/CreationSteps.tsx) y [estilos del asistente](../../apps/shared-ui/brujula-wizard.css) |
| Confirmaciones de Estudio | [StudyConfirmation](../../apps/web/src/features/study/ui/study-confirmation.tsx) |

Los estados de carga y guardado indican la operación. Un vacío explica qué falta y ofrece la acción permitida. Los errores recuperables conservan los datos ingresados. Para verificar un cambio, comprobá foco, teclado, contraste, tamaño de controles, movimiento reducido y ajuste al ancho real. [Evidencia](../verification/README.md) · [Política documental](../documentation-policy.md)
