# Foxy: espacio privado y recursos revisados

Foxy exige docente verificado en el servidor. El estudiante recibe una denegación al abrir la ruta; sólo ve materiales que el docente haya publicado y su membresía autorice.

## Conversaciones y recursos

Elegir contexto general o aula propia, revisar fuentes y conversar. Al elegir un aula se prepara una conversación privada vacía, sin llamar a IA, para seleccionar temas y fuentes antes del primer mensaje. Cambiar el contexto inicia otra conversación; no reclasifica ni cambia el origen de la anterior. El contexto no significa enviar toda el aula al proveedor. Fuentes y temas deben seleccionarse explícitamente; la selección se reinicia al abrir otra conversación o recargar.

Conversaciones permite buscar por título y filtrar Todas, General o aula propia (incluidas archivadas para consulta). El título puede renombrarse (1–120 puntos de código); el servidor exige revisión vigente y propiedad. Ante conflicto se conserva el texto ingresado y se recupera la revisión actual para volver a guardar. El primer mensaje genera un título útil de una línea, sin modificar el contenido enviado.

El widget alterna **Herramientas / Creaciones**. Las cinco herramientas son apuntes, esquemas, actividades, planificaciones y rúbricas. Creaciones reúne resultados listos de todas las conversaciones, con búsqueda por título y filtros por tipo, contexto y estado. Incluye textos anteriores aunque aún no se hayan abierto como recurso y visuales listos disponibles; las respuestas de chat general no son creaciones. Abrir texto va directamente a su editor; abrir un visual recupera el trabajo exacto aunque esté fuera de la primera página. Markdown presenta títulos, listas y énfasis con texto escapado; no ejecuta HTML ni enlaces del modelo.

Los avisos de información insuficiente permanecen en la conversación y no aparecen como creaciones. El proveedor debe dejar markdown/referencias vacíos y explicar lo faltante en missingInformation; la respuesta completa exige contenido y missingInformation vacío. El parser conserva validación estricta de esas reglas y de las referencias seleccionadas.

El origen y los destinos se muestran por separado: trabajar con contexto de aula no publica ni asigna. Los destinos proceden de publicaciones y traspasos efectivos autorizados: **privado/sin asignar**, **en preparación** (incluye preparado sin confirmar), **borrador de actividad**, **publicado/asignado**. Una creación puede tener varios destinos; el resumen prioriza publicado, borrador, preparación y privado. Destinos publicados o borradores tienen navegación directa reautorizada; preparaciones sin material todavía no tienen enlace público. Retirados, materiales eliminados y destinos de otros propietarios no se presentan como asignados.

Conversación visible abre en un clic. En móvil las colecciones tienen accesos directos: abrir colección, elegir un filtro y abrir resultado requiere hasta tres acciones. Búsqueda por título permite encontrar elementos de páginas posteriores sin recorrerlos; escribir texto no agrega pasos de navegación. Las revisiones y confirmaciones de publicación conservan sus pasos adicionales.

Abrir recurso permite editar título/contenido. Preparar en Actividades crea un TP privado; todavía necesita revisión y asignación. No documentar ese traspaso como publicación automática o como creación arbitraria de cualquier tipo.

Planificación y rúbrica siguen siendo texto editable. Publicar una planificación en Biblioteca no modifica el Plan curricular. Usar una rúbrica en actividad requiere transcribir/revisar criterios y completar objetivo y consignas; no se automatiza su conversión ni se modifica una actividad existente.

## Consultas privadas

`GET /api/v1/foxy-ai/conversations` conserva `limit/after` y agrega `q/context`. `GET /api/v1/foxy-ai/creations` acepta `limit` 1–50, `after` (base64url de `{createdAt,id}`), `q` hasta 120 puntos de código, `context` ALL/GENERAL/UUID, `type` ALL/NOTE/PLAN/ACTIVITY/RUBRIC/DIAGRAM/IMAGE y `status` ALL/PRIVATE/PREPARING/DRAFT/PUBLISHED. Devuelve `{items,next}`. Búsqueda literal sin distinguir mayúsculas, filtros antes del límite y cursor estable por milisegundos/ID; `%` y `_` no son comodines.

Ambos catálogos exigen docente verificado y aislamiento por propietario; no generan IA ni crean recursos al listar. Consulta de Creaciones combina turnos, recursos, trabajos/activos visuales, publicaciones y recibos de traspaso vigentes, sin nueva entidad ni migración. Respuestas privadas `no-store`; validación de parámetros en proxy/API; consultas anteriores se cancelan y no reemplazan filtros más nuevos.

## Publicar material

Seleccionar aula, unidad/tema y título → preparar PDF o recurso visual → revisar disponibilidad/vista previa → Revisar publicación → confirmar que se revisó → Publicar en Biblioteca. Preparación y confirmación tienen revisiones e identidades distintas. Una vista previa privada no se vuelve accesible para estudiantes antes de publicar.

Texto, imágenes y esquemas usan colas, límites y configuración propios. La UI informa cola/proceso, disponibilidad, fallos y cupo insuficiente. Un reintento no debe duplicar turnos o publicaciones; respuesta tardía no sustituye cambios actuales.

Gestión/descartes respetan custodia e historia; no autorizan eliminar archivos compartidos del aula. Configuración, claves, consumo y presupuesto se mantienen en backend.

Fuentes: [unidad transaccional](../../../apps/api/src/foxy-ai/unit-of-work.ts), [publicación](../../../apps/api/src/foxy-ai/publication-service.ts), [UI](../../../apps/web/src/components/foxy-workspace.tsx), [modelo](../data-model.md).

[Prueba actual](../../verification/flows.md): la base del 2026-11-07 comprobó texto/imagen y consulta estudiantil, con límites en esquema/traspaso. La [revisión del 2026-11-08](../../work-log/2026-11-08-root-foxy-review.md) agregó publicación de esquema y creación de TP privado con criterio transcripto. La [mejora de organización](../../work-log/2026-11-08-root-foxy-implementation.md) comprueba catálogo privado, renombrado/recarga, fuentes previas, destinos y recorridos de tres clics; el [recibo](../../verification/foxy-discovery.json) registra navegación y foco. Todos usan proveedores sintéticos; no se atribuye calidad pedagógica o generación real, ni publicación de un TP al alumnado en esta entrega.

Posteriormente se comprobó Gemini real con la clave aportada por el usuario y gemini-3.8-flash en fixtures propios: chat/continuidad, fuentes, aviso de insuficiencia y las cinco herramientas. El [recibo real](../../verification/foxy-gemini-real.json) distingue generaciones, publicación directa de apunte, reproducción de resultados completos para persistencia/traspaso, dos timeouts y las correcciones derivadas. Ese ensayo aislado no habilitaba el entorno habitual ni acredita un único recorrido externo de todas las herramientas sin interrupciones.

El usuario autorizó después la activación local y conservar esa clave como configuración habitual de pruebas. `.env` de raíz queda habilitado y completo; `npm run local:up` y `local:restart` usan Gemini real sin overrides. El [recibo de la plataforma](../../verification/local-gemini-runtime.json) acredita tres generaciones reales (chat, continuidad y apunte con PDF), publicación revisada, catálogo/destino y conservación de sesión/datos/clave al reiniciar. La [guía local](../local-development/README.md) define los comandos y recursos propios. No se repitieron las otras herramientas en ese recorrido ni se habilitó generación de imágenes; no implica despliegue.

## Feedback y lectura del chat

El pulido UX del 2026-11-09 comparte presentación de herramientas y espera con Carpetas de estudio. El mensaje saliente aparece antes de la confirmación y se reconcilia con el turno recibido. Un envío incierto conserva la solicitud del controlador y reintenta con su identidad original. No se simula una respuesta parcial ni se agrega streaming al contrato. El chat conserva la posición al leer historia y ofrece volver a mensajes nuevos. Carga inicial, cola y procesamiento tienen estados accesibles; reduced-motion desactiva la animación. [Evidencia y límites](../../verification/foxy-study-ux-polish.json).

Al iniciar el envío se retira la bienvenida. El seguimiento del final contempla la llegada de contenido y los cambios de tamaño de la conversación; si el usuario está leyendo historia, conserva su posición y muestra «Ver mensajes nuevos». En móvil, los tres accesos del workspace se disponen en una fila y el alto del chat deja visible el compositor en 390×844.

[Workspace escritorio](../../design/current/ux-foxy-desktop.png) · [móvil](../../design/current/ux-foxy-mobile.png) · [herramientas](../../design/current/ux-foxy-tools-mobile.png) · [envío pendiente](../../design/current/ux-foxy-pending-mobile.png). El envío pendiente se capturó con respuesta sintética controlada; las referencias integradas no implican una generación nueva.
