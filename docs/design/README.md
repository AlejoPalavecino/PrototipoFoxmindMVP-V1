# UX/UI vigente de FoxMind

Referencia actual: aplicación Brújula recorrida con Ego Lite sobre código real, API/SQL/archivos/escáner/correo propios y cuentas sintéticas. Las capturas y checks se consultan en la [galería](current/README.md) y [matriz por flujo/rol](../verification/flows.md). No se usa una maqueta histórica como autoridad.

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

## Estados e interacción

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

Actualizar esta guía y el flujo afectado cuando cambie UX. Guardar referencias actuales con identidad del candidato, rol, viewport, acción, resultado y límites. Propuestas nuevas deben aprobarse antes de implementarse; no usar una captura antigua o un HTML de demo para alterar permisos. [Política documental](../documentation-policy.md).
