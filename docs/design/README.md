# UX/UI vigente de FoxMind

## Dirección vigente de Inicio docente — 2026-11-11

Seguimiento elimina los textos de alcance/orden estáticos y coloca un selector accesible arriba a la derecha, adaptable a una segunda fila en móvil. Título y selector comparten eje vertical; pestañas y Ver todas comparten fila y altura de 44 px. Mi agenda presenta la fecha sólo en el bloque lateral y el horario (o Todo el día) debajo del título, con separación uniforme entre eventos. Entregas y Consultas mantienen su elección independiente y todas las páginas respetan el orden.

Aula en foco expone Cambiar aula junto al título. El próximo tema usa superficie durazno, acento naranja redondeado, unidad secundaria y acción con flecha circular al extremo derecho. Mini agenda usa tarjetas menta/lavanda para eventos y durazno para próxima entrega, con fecha, contenido y acceso alineados; texto oscuro y etiquetas conservan significado sin depender del color.

Cada acción del aula abre un diálogo con su tono visual, portada/nombre/división, selección única y Continuar. No altera el aula en foco. Radios nativos admiten teclado; Cancelar/Escape devuelve el foco. Carga, vacío, error y reintento están cubiertos; en móvil los borradores siguen a los widgets prioritarios.

[Capturas actuales](current/README.md#inicio-docente--2026-11-11) y [recibo](../verification/teacher-home-polish.json). Son componentes reales con datos sintéticos en navegador; la persistencia y autorización SQL se comprueban por separado.

Referencia actual: aplicación Brújula recorrida con Ego Lite sobre código real, API/SQL/archivos/escáner/correo propios y cuentas sintéticas. Las capturas y checks se consultan en la [galería](current/README.md) y [matriz por flujo/rol](../verification/flows.md). No se usa una maqueta histórica como autoridad.

## Rediseño de Mis aulas implementado

Integrado y publicado en main (122daaa), con frontend docente/estudiante y backend de códigos/invitaciones. Evidencia en el [registro de integración](../work-log/2026-11-11-root-classrooms-frontend.md).

El 2026-11-11 el usuario aprobó los recorridos de Mis aulas docente, incluidas invitaciones múltiples y código de seis dígitos vigente hasta regeneración docente. Luego pidió recuperar la identidad visual de FoxMind y recorrer los flujos de principio a fin. El [diseño detallado](classroom-teacher-redesign.md) documenta los recorridos y criterios. El [prototipo local](classroom-teacher-preview.html) permite probarlos con datos ficticios. Las secciones siguientes describen el producto implementado.

La ampliación de la maqueta incorpora autoría manual/IA compartida, lectura de consignas, revisión de entregas por tipo y aula estudiantil con la misma UI. El selector de personaje es exclusivo del prototipo; las cuentas reales conservan rol exclusivo. Entregas, archivos, generación y devoluciones se recorren con datos locales de ejemplo.

## Dirección vigente de Foxy y estudio

El pulido aprobado el 2026-11-09 conserva la identidad Brújula y usa Foxy docente como referencia para el espacio estudiantil. Las diferencias de contenido responden al rol y al objeto creado; los controles comunes mantienen la misma presentación e interacción.

| Área | Regla de UX/UI vigente | Referencia |
|---|---|---|
| Herramientas | Tarjetas con icono, nombre y descripción secundaria; selección visible. Herramientas, Creaciones y Conversaciones accesibles directamente en móvil | [Foxy](current/ux-foxy-tools-mobile.png), [estudio](current/ux-study-tools-mobile.png) |
| Chat | Mensaje saliente inmediato y espera de Foxy; la bienvenida desaparece al enviar. El campo y Enviar permanecen visibles en el viewport móvil comprobado | [Docente](current/ux-foxy-mobile.png), [estudiante](current/ux-study-chat-mobile.png) |
| Lectura e historial | Acompañar mensajes y cambios de tamaño sólo cuando se está al final. Al leer mensajes anteriores, conservar posición y ofrecer «Ver mensajes nuevos» | [Guía Foxy](../engineering/ai/foxy.md#feedback-y-lectura-del-chat) |
| Carga y error | Nombrar la operación real: abrir, subir/validar, enviar, esperar o analizar. Animación discreta con movimiento reducido; conservar entrada o solicitud recuperable | [Espera](current/ux-study-pending-mobile.png), [error](current/ux-study-error-mobile.png) |
| Colecciones | Un selector compartido para Activas, Archivadas y Pendientes, con contador y estado seleccionado. Mostrar sólo los estados autorizados para ese rol/espacio y mantener los filtros propios de cada dominio | [Aulas](current/ux-classrooms-mobile.png), [carpetas](current/ux-study-collection-mobile.png) |
| Creación | Diálogo, pasos y portadas compartidos. Encabezado opaco al desplazar; nombres e ilustraciones sin recortes. Guardar borrador y confirmar creación siguen siendo acciones diferentes | [Aula](current/ux-classroom-create-mobile.png), [carpeta](current/ux-study-create-mobile.png), [portadas](current/ux-study-covers-mobile.png) |
| Plan de estudio | Durante el análisis, priorizar la espera sin repetir opciones deshabilitadas. Después, resumen de unidades/temas y edición desplegable; abrir inicialmente las incompletas y conservar su apertura al escribir | [Carga](current/ux-plan-loading-mobile.png), [revisión](current/ux-plan-review-mobile.png), [edición](current/ux-plan-editor-mobile.png) |

Las fuentes del chat estudiantil se consultan en un desplegable de jerarquía secundaria; los UUIDs de versión quedan fuera de la lectura principal. No simular tokens, progreso porcentual o resultados mientras se espera. Un error estudiantil conserva el texto; un envío docente sin confirmación conserva su solicitud para reintentar con la misma identidad. Consultar los límites de cada ensayo en el [recibo](../verification/foxy-study-ux-polish.json).

La referencia visual de este pulido comprende 28 capturas inspeccionadas a 1440×1000 y 390×844. Las capturas anteriores de estas superficies documentan sus recorridos previos; no son la dirección visual a copiar. Prácticas, examen, perfil y otras superficies sin rediseño conservan sus referencias específicas.

## Información y navegación

Carpetas de estudio agrega navegación exclusiva del estudiante, colección de tarjetas/banner como aulas, asistente de cuatro pasos y un interior con chat/herramientas/creaciones/conversaciones como Foxy. Materiales/Plan, práctica y examen se abren en diálogos con foco gestionado. La dirección aprobada y estados se conservan en [propuesta](../product/study-folders-proposal.md); la [evidencia](../verification/study-folders.json) indica viewports y límites de QA.

Sidebar desde 1024 px; en tamaños menores, menú compacto con drawer y retorno de foco. Global: Inicio, Mis aulas, Agenda, búsqueda, notificaciones y Mi cuenta; Foxy sólo docente. Perfil y Configuración de cuenta están dentro de Mi cuenta.

| Contexto | Secciones |
|---|---|
| Aula docente | Plan, Muro, Biblioteca, Actividades, Progreso, Alumnos, Historial, Configuración |
| Aula estudiante | Plan, Muro, Biblioteca, Actividades, Mi progreso, Compañeros |

Inicio docente prioriza Por atender, acciones y aula en foco; estudiante, Mis entregas y devoluciones publicadas. Las cifras Enseño/Estudio de la proyección no son un selector de rol dual. El banner, las tarjetas y los accesos conservan jerarquía por rol, sin métricas inventadas.

## Perfil y Configuración

Mi perfil ofrece Mis iniciales y cuatro avatares Foxy generados a partir de la mascota vigente. Selección única con radios nativos, vista previa y aviso Sin guardar; Guardar cambios aplica nombres/avatar juntos. En móvil, iniciales ocupa una fila y los cuatro Foxy se distribuyen en dos columnas; escritorio presenta cinco opciones. La imagen elegida aparece en el resumen, navegación y diálogo Mi cuenta. Foco visible, bloqueo durante guardado y error con reintento conservan los controles de cuenta.

En Configuración los botones Mostrar/Ocultar quedan centrados dentro de campos de 48 px, con objetivo de 44 px y espacio reservado para evitar superposición del texto. La corrección está limitada a la pantalla privada. [Evidencia actual](../work-log/2026-11-08-root-profile-avatars.md).

## Recorridos de referencia

| Flujo | Secuencia actual |
|---|---|
| Cuenta | Elegir rol permanente → registrar → login → verificación con confirmación → Ir a Inicio |
| Recuperar acceso | Solicitar correo genérico → enlace de un uso → nueva contraseña → login |
| Crear aula | Datos/documento/portada → elección IA/manual → unidades/temas → revisión editable → confirmar |
| Crear carpeta de estudio | Datos/documento/portada y vínculo opcional → IA/manual → unidades/temas → revisión → confirmar activación |
| Ingresar | Código → vista previa → confirmar inscripción; invitación → aceptación expresa |
| Manual de actividad | Preparar → Revisar y asignar; guardar borrador y asignar separados |
| IA de actividad | Tema/objetivo → material/nivel → revisar/generar → propuesta editable → borrador privado → editor normal |
| TP | Ver consigna → preparar/continuar → seleccionar/subir archivo → revisar → confirmar → comprobante |
| Cuestionario/evaluación | Responder → autoguardar → revisar completas/incompletas → confirmar |
| Corregir | Intento → nota/rúbrica privada → guardar → revisar publicación → confirmar |
| Foxy | Conversación/contexto → recurso privado → preparar destino/archivo → revisar → confirmación y publicación |
| Biblioteca TEXT | Escribir/publicar → leer → revisar como nueva identidad → conservación/eliminación según vínculos |
| Aula | Salida/remoción → revocación e historia → nueva invitación para readmitir; archivo/reactivación no borran historial |
| Agenda | Crear → detalle → editar/alcance de serie → eliminar ocurrencia/serie |

Las [funciones por rol](../product/features-by-role.md) y [especificación](../foxmind-v1-functional-spec.md) explican permisos y reglas. Los nombres de botones de esta tabla reflejan el recorrido vigente; compatibilidad del API no agrega botones al producto.

## Sistema visual implementado

Familia Lexend cargada como Brújula. Texto #252646, secundario #60667D, fondo #F4F7FE, acción #B8490C, borde #DBE1F0; superficies blancas. Radios base de controles 11 px y tarjetas 18 px, con variantes por pantalla. Fuentes: [CSS principal](../../apps/shared-ui/brujula.css), [controles](../../apps/shared-ui/brujula-controls.css) y recursos en [public](../../apps/web/public/).

Reutilizar componentes/navegación existentes antes de agregar variantes. Nombres fm3d/p5 y recursos anteriores todavía cargados son parte de la implementación; no confundirlos con documentación vieja descartable. Validar estilos calculados y contexto real; los tokens no garantizan contraste de toda combinación.

| Elemento compartido | Fuente de implementación |
|---|---|
| Selector de estados | [CollectionStateFilter](../../apps/shared-ui/CollectionStateFilter.tsx) |
| Tarjetas de herramientas | [FoxyToolPicker](../../apps/shared-ui/FoxyToolPicker.tsx) |
| Feedback de carga de Foxy/estudio | [AsyncFeedback](../../apps/shared-ui/AsyncFeedback.tsx); Aulas conserva [AiProgress](../../apps/shared-ui/AiProgress.tsx) para su extracción |
| Seguimiento del chat | [useChatFollow](../../apps/shared-ui/use-chat-follow.ts) |
| Pasos y portadas de creación | [CreationSteps](../../apps/shared-ui/CreationSteps.tsx), [WizardCover](../../apps/web/src/features/classrooms/ui/WizardReview.tsx), [estilos compartidos](../../apps/shared-ui/brujula-wizard.css) |

## Estados e interacción

La [dirección vigente](#dirección-vigente-de-foxy-y-estudio) reúne las reglas del pulido de chat, herramientas, creación y plan. Su [recibo de validación](../verification/foxy-study-ux-polish.json) distingue app integrada y estados controlados con respuestas sintéticas; las capturas no sustituyen la evidencia de permisos o persistencia.

Foxy conserva Brújula y agrega título de conversación con Renombrar, formato seguro de títulos/listas y acceso a temas/fuentes antes del primer envío de aula. Conversaciones usa búsqueda por título y chips de contexto. El widget lateral alterna Herramientas/Creaciones; Creaciones ofrece búsqueda, filtros por tipo/contexto/estado y apertura directa con origen y destinos separados. Aulas archivadas siguen disponibles como filtro de consulta; sólo activas se ofrecen para generar/publicar. Móvil expone Herramientas, Creaciones y Conversaciones directamente, con diálogos y retorno de foco. Colección → filtro → resultado son tres acciones; resultados recientes abren con una o dos. Publicación conserva preparación, revisión y confirmación. [Reglas](../engineering/ai/foxy.md), [seguimiento](../../odd/tasks/foxy-workspace-discovery.md).

Mis aulas docente incorpora Pendientes junto a Activas/Archivadas, con contador, banner «Pendiente de creación» en cada tarjeta y acciones Continuar creación/Eliminar pendiente. Invitaciones se mantienen aparte. Eliminar abre diálogo con nombre, advertencia de pérdida, Cancelar y Eliminar pendiente; carga bloquea duplicados y error conserva contexto. [Reglas y contrato](../engineering/classrooms/README.md). La referencia de pendientes del 2026-11-08 utiliza componentes reales con cliente sintético; no atribuye persistencia a esas capturas. Ver [evidencia de pendientes](../work-log/2026-11-08-root-pending-classrooms.md).

Carga y guardado deben indicar operación y bloquear duplicados. Una respuesta tardía no reemplaza cambios. Vacío debe explicar qué falta y ofrecer acción autorizada. Error debe conservar datos cuando corresponda, distinguir validación/permiso/conflicto/cuota/servicio y ofrecer recuperación sin reenviar una mutación confirmada.

Confirmaciones son distintas: asignar actividad, enviar intento, publicar nota/recurso, salir/remover/archivar/eliminar. Un archivo listo no es entrega; corrección privada no es publicación. Mostrar el recibo y estado persistido.

Formularios largos tienen scroll y jerarquía por secciones. En el recorrido de Ego hubo limitaciones de autoscroll/selectores; se registran como herramienta, sin atribuirlas automáticamente a FoxMind ni ocultar el uso de clicks DOM de respaldo.

## Responsive y accesibilidad

Referencias actuales incluyen escritorio de 1440 px, tablet de 768 px, móvil de 390 px y formularios móviles; otras capturas tienen el viewport registrado en JSON. No hay overflow horizontal en los controles geométricos conservados del catálogo actual.

Se comprobó navegación móvil/Escape y retorno de foco, etiquetas y estados mediante snapshots; no es auditoría WCAG completa. Para cada cambio revisar teclado, tabulación, foco visible/diálogos, contraste, objetivos táctiles y reduced-motion, además de estados carga/vacío/error.

Las capturas de resultado móvil incluyen scroll al bloque de devolución para que la referencia muestre el dato relevante. Una captura no prueba bytes o autorización: esos checks tienen recibos adicionales y alcance propio en la matriz.

## Cambios futuros

Mis aulas docente/estudiante del 2026-11-11: la [dirección detallada](classroom-teacher-redesign.md) y [maqueta navegable](classroom-teacher-preview.html) se trasladan al frontend en `codex/classrooms-ux-unification`. Catálogo con píldora, navegación compartida, creación amplia, unidades/temas legibles, contenidos, autoría manual/IA, revisión de entregas y devolución usan recursos/colores actuales de FoxMind. Los cambios de permiso se limitan a la ampliación autorizada de códigos/invitaciones; [tablero y límites verificables](../../odd/tasks/classrooms-ux-unification.md). No está integrado ni desplegado.

Actualizar esta guía y el flujo afectado cuando cambie UX. Guardar referencias actuales con identidad del candidato, rol, viewport, acción, resultado y límites. Propuestas nuevas deben aprobarse antes de implementarse; no usar una captura antigua o un HTML de demo para alterar permisos. [Política documental](../documentation-policy.md).
