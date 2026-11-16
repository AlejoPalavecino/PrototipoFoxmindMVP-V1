# FoxMind · plan de implementación de la maqueta

**Fecha:** 2026-11-15 · **Estado:** propuesta preparada para aprobar ejecución en el producto.

**Spec:** pedido del usuario: llevar al producto la misma presentación, funcionalidades y experiencia de la maqueta, para docente y estudiante.

**Design:** [HTML autónomo](01-foxmind.html), fuentes de este directorio y [auditoría final](FINAL-AUDIT.md). El manifiesto de la auditoría identifica el candidato y sus capturas. El HTML es la referencia visual y de interacción, no una implementación del servidor.

**Approval:** autorizadas la auditoría, sus correcciones de maqueta y este plan. La implementación del producto, las migraciones y la publicación no se ejecutaron en este trabajo. Las decisiones de producto que la simulación no define están agrupadas al final.

**Base inspeccionada:** `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`. Antes de ejecutar hay que contrastar esta base con el HEAD vigente y preservar el trabajo concurrente. No usar la fecha o el hash de una guía histórica como prueba del código actual.

## 1. Resultado y límites de la paridad

Para las mismas personas sintéticas, datos, permisos, estado y viewport, FoxMind debe mostrar la misma jerarquía, tipografía, colores, portadas, geometría de componentes, acciones y secuencia de pasos que la maqueta. Una pantalla no está terminada si sólo se parece, pero sus botones siguen llevando al flujo anterior.

- Preservar la dirección aprobada: Nunito local, naranja principal, superficies pastel con tinta oscura, radios suaves, ilustraciones contenidas, navegación compactable y mensajes breves en español argentino.
- Reproducir estados inicial, cargando, vacío, error recuperable, borrador, éxito y consulta; no sólo capturas con datos ideales.
- El chat aprovecha el alto y ancho disponibles. Historial, herramientas, creaciones y materiales se abren a demanda; contexto y Nuevo chat son explícitos. La navegación plegada oculta accesos rápidos a aulas.
- Actividades y corrección tienen un espacio de trabajo específico; confirmaciones y selecciones breves usan diálogos. Las acciones no quedan tapadas por barras fijas ni por el teclado móvil.
- Rojo comunica error y verde éxito; incluir texto e icono para que el color no sea la única señal. Los colores elegidos para eventos son categorías, no resultados.
- Reemplazar datos fijos, temporizadores, respuestas inventadas y persistencia local de negocio por fuentes reales. El selector de rol y los controles de demostración no pasan al producto.
- No degradar capacidades vigentes que la maqueta no simula: autenticación, contraseña, sesiones, archivos reales, repetición de eventos, auditoría, permisos, políticas de evaluación y recuperación de trabajos.

La paridad se controla con fixtures comunes, capturas comparables y recorridos ejecutables. No se promete igualdad de cada píxel entre motores y sistemas operativos distintos. En un entorno de captura fijado, toda diferencia visible debe explicarse y aceptarse; no se actualizan imágenes de referencia para ocultar una regresión.

## 2. Arquitectura de implementación

Conservar Next/React del frontend, Nest del API, PostgreSQL/Prisma, módulos por dominio y adaptadores existentes de archivos e IA. No hace falta cambiar el stack ni reconstruir los servicios para aplicar este diseño.

La maqueta concatena scripts y hojas de estilo de sucesivas iteraciones. Es útil como referencia, pero no conviene trasladar al producto sus variables globales, `innerHTML`, overrides acumulados ni `localStorage` como modelo. Implementar componentes React dentro de las features actuales, con tokens compartidos y viewmodels derivados de DTO autorizados.

Primero consolidar la navegación: Aulas usa `AppNavbar` y otras pantallas `AccountNavbar`. Crear un único shell visual reutilizable sobre las sesiones existentes, con variante normal, rail y trabajo enfocado. Conservar la validación de identidad y rol en servidor y pantallas; ocultar un botón nunca sustituye permisos.

Referencias: [arquitectura](../../docs/engineering/architecture.md), [shell](../../apps/web/src/application/application-shell.tsx), [composición de aulas](../../apps/web/src/application/academic-Classrooms.tsx), [rutas web](../../apps/web/pages).

## 3. Inventario trazable

| Área de referencia | Frontend propietario | Backend y dato a reutilizar o ampliar | Criterio observable |
|---|---|---|---|
| Inicio docente/estudiante, bienvenida, pendientes y día compacto (`home.*`, `day-widget.*`) | `screens/home-screen.tsx`, `academic-Classrooms.tsx`, feature Home y navegación | Proyecciones de Home, entregas pendientes, consultas, aulas y Agenda del usuario | Los contadores y acciones reflejan datos reales. Una devolución publicada o consulta respondida sale de pendientes sin recarga manual. |
| Mis aulas, invitaciones y creación de cuatro pasos (`classrooms.*`, `classroom-wizard.js`) | `screens/classrooms-screen.tsx`, features classrooms/curriculum y autoría de aula | Borradores, invitaciones, códigos y generación de plan ya existentes | Atrás conserva datos; cancelar protege cambios; fallo no crea un aula parcial; aceptar una invitación no modifica las otras. |
| Cabecera, Plan, Muro, Biblioteca, miembros e historial (`teaching-room.*`, `teaching-library.*`) | `academic-ClassroomView.tsx`, `ClassroomNavigation.tsx`, `PlanWorkspace.tsx`, `Wall.tsx`, `Library.tsx` | Curriculum, communication, materials, membership y auditoría | Tema dado individual, recursos de tema/unidad y actividades relacionadas correctas; cada muro pertenece al aula abierta. |
| Actividades, creación manual/IA y propuesta editable (`activity-authoring.*`) | `academic-Activities.tsx`, `features/activity-authoring`, `features/activity-generation` | Generación, borradores y publicación; ampliar idea privada y temas de varias unidades | La IA nunca publica. El docente ve/edita consigna, preguntas y rúbrica y confirma lo que recibirán estudiantes. |
| Ver, resolver, entregar, recibo y devolución (`learning-*`, `participation.*`) | features participation, `academic-AttemptHistory.tsx`, activity sessions | Intentos, borradores, entrega, archivos y resultados publicados existentes | Guardar respuesta no entrega. Entregar es idempotente, genera recibo y sólo lectura. El estudiante no ve claves ni correcciones privadas. |
| Revisión docente y progreso (`learning-grading.js`, `grading-polish.css`) | `GradingEditor`, `GradingAiReview`, `PublishedResult`, `Progress.tsx` | Grading y proyecciones de progreso, con políticas actuales | Corrección privada hasta publicación explícita; cero es una nota válida; gráficos usan datos de la misma población y período. |
| Agenda (`agenda.*`, `agenda-events.js`) | `agenda-screen.tsx`, `features/agenda/ui/{Agenda,AgendaMonth,AgendaPeriod,AgendaDay,EventForm}` | Agenda y color existentes; agregar destino exacto de repaso y detección de choques | Crear/editar/eliminar refleja el cambio en todas las vistas; mantener zona horaria, recurrencia y eventos de día completo. |
| Foxy docente (`foxy-*`, `chat-expansion.css`) | `foxy-screen.tsx`, `foxy-workspace.tsx`, chat controller, publication y visual workspace | Conversaciones, archivos privados, jobs y publicación preparados; ampliar alcance de contexto y cancelación | Historial y borrador no se pierden al abrir herramientas; aula/contexto nuevo no mezcla conversaciones; creación llega a Biblioteca sin descargar y subir. |
| Mi estudio y carpetas (`study-folders.*`, `study-practice.*`, `foxy-planner.js`) | `study-screen.tsx`, `study-workspace`, `study-wizard`, `study-practice`, `study-materials` | Study folders/JSON versionado, fuentes privadas/vivas, prácticas y review sessions | Mismo wizard visual que aulas; aula opcional, copia del plan editable, archivos propios; plan confirmado llega una sola vez a Agenda. |
| Notificaciones (`notifications.*`) | `notifications-screen.tsx`, `features/notifications/ui/Notifications.tsx` | Lectura, apertura autorizada y cursor actuales; ampliar filtros globales, no leída y orígenes | El filtro aplica a toda la bandeja, el contador coincide, y abrir lleva al recurso correcto o a una recuperación clara. |
| Mi perfil (`profile.*`) | `identity-screen.tsx`, `account-profile.tsx`, account client | `PATCH /account` y catálogo vigente | Vista previa distinta del guardado; error preserva edición; recargar refleja nombre/avatar guardados en toda la app. |

Las rutas de pantalla anteriores son relativas a `apps/web/src/`. Las pestañas de aula hoy se componen dentro de `/mis-aulas` con query params; no se necesita crear una página física por pestaña. Mantener URLs con identidad estable de aula, actividad, intento, carpeta y conversación para soportar recarga, enlaces y Atrás/Adelante.

## 4. Contratos y cambios reales de backend

### 4.1 Autoría IA e interunidad — cambio de modelo necesario

Hoy el contrato admite varios temas de una sola unidad. La maqueta permite seleccionar temas de distintas unidades o repasarlas completas. `ActivityTopic` usa una FK de actividad que incluye `unit_id`; no se resuelve enviando más IDs desde la UI.

1. Diseñar contrato compatible de alcance con varias unidades/temas y pertenencia a una sola aula. Expandir una selección de unidad a un snapshot de temas autorizado al generar/confirmar.
2. Migrar la relación de actividad a `(activity_id, classroom_id)` conservando la FK tema–unidad–aula, orden e integridad. Mantener lectura de actividades y jobs anteriores; definir el significado transitorio del `unitId` singular para consumidores legados.
3. Agregar `teacherBrief` privado, separado de `objective`, que hoy termina publicado. La UI exige la idea antes de generar. Guardar solicitud y snapshot del job; persistirla en borrador si se debe recuperar antes de generar.
4. Actualizar selección de fuentes, generación, aplicación, autoría manual, edición, DTO y proyección inversa Plan→actividad.
5. Conservar revisión optimista y bloqueo de cambios incompatibles tras la primera participación. No aplicar resultados tardíos sobre una revisión que cambió.

Pruebas obligatorias: backfill con datos de una unidad, repaso interunidad, tema de otra aula rechazado, permisos, borrador invisible a estudiante, idea privada ausente del DTO estudiantil, edición de rúbrica y pesos, job anterior en curso y primer intento concurrente con edición.

Fuentes: [solicitud de generación](../../src/core/domain/activities/activity-generation-request.ts), [ActivityTopic](../../prisma/schema.prisma), [autoría](../../apps/api/src/modules/activities/application/activity-authoring.ts), `apps/api/src/modules/activities/infrastructure/activity-topics.ts`.

### 4.2 Biblioteca, fuentes y formatos

Separar dos capacidades: un archivo que se puede guardar/descargar y un archivo cuyo contenido puede usar IA. La maqueta simula ambos; el producto debe indicar preparación, cuarentena, rechazo y contenido insuficiente de forma real.

- Conservar IDs y referencias a bytes existentes. `ActivityMaterial` ya es m:n; falta un comando transaccional desde Biblioteca para asociar el material a actividades elegibles y aplicar el mismo bloqueo que autoría.
- Si la descripción independiente del archivo debe persistir, agregar columna nullable; no sobrecargar el cuerpo extraído. Metadatos y asociaciones se guardan juntos o se informa un fallo recuperable sin publicar vínculos parciales.
- PDF/DOCX ya están contemplados en extracción. PPTX tiene validación en materiales, pero requiere extracción y ampliación de políticas de adjuntos. DOC/PPT necesitan validación estructural y extracción aislada con límites; la extensión sola no prueba el formato.
- Aprobar una matriz propósito×formato×tamaño antes de ampliar políticas, proxy y constraints SQL. La maqueta ofrece 20 MiB por archivo; el chat actual tiene seis archivos y 20.000.000 bytes acumulados; Biblioteca tiene límites por propósito de hasta 50 MB. No reemplazar esos límites silenciosamente.
- Validar bytes vacíos, nombre/extensión/MIME discordantes, archivo malformado, descompresión excesiva, digest, cuotas, escaneo, acceso por dueño y revocación durante la preparación.

Fuentes: [política de adjuntos](../../apps/api/src/modules/files/infrastructure/chat-attachment-policy.ts), [Biblioteca](../../apps/api/src/modules/materials/application/library.ts), [especificación de archivos](../../docs/foxmind-v1-functional-spec.md).

### 4.3 Foxy: contexto, creaciones y espera

Ya existen General/aula, nuevo chat al cambiar contexto, búsqueda, renombrado, adjuntos privados y preparación/confirmación de publicación. La implementación debe reutilizarlos.

- El modo «aula completa» de la maqueta necesita un contrato explícito. El servidor resuelve plan, materiales, actividades autorizadas y archivos propios; congela referencias efectivamente usadas, revisión y procedencia. Si excede límites, pedir acotar con una selección comprensible; no truncar en silencio ni afirmar que leyó todo.
- Las referencias vivas se resuelven de nuevo para cada nueva generación. Reemplazo, eliminación, archivo del aula o pérdida de pertenencia tienen reglas distintas. Revocación corta futuras lecturas; conservar historial privado no autoriza reutilizar su fuente revocada.
- Los visuales no usan hoy todos los adjuntos privados. Extender su lector/snapshot o explicar por herramienta qué material entra, antes de prometer una mini biblioteca universal.
- Publicación directa ya es idempotente por `requestId`. La maqueta además evita repetir la misma revisión de creación en la misma aula. Resolver ese caso bajo el lock existente por dueño/origen/revisión/destino; devolver el trabajo previo, preservar historial y permitir publicar una revisión nueva.
- Los textos de espera se vinculan a etapas observables. Evitar porcentajes ficticios. Distinguir timeout de observación, fallo y cancelación. «Detener» que cancela trabajo durable requiere comando idempotente por dueño, control de lease y rechazo de aplicación tardía; abortar el fetch no cancela al proveedor.

Fuentes: [Foxy vigente](../../docs/engineering/ai/foxy.md), [grounding](../../apps/api/src/modules/foxy/infrastructure/assemble-grounding.ts), [publicación](../../apps/api/src/modules/foxy/infrastructure/publication-repository.ts), [controller web](../../apps/web/src/features/foxy/model/foxy-chat-controller.ts).

### 4.4 Carpetas, contexto vivo y repaso

`linkedClassroomId` ya es opcional y el estado de carpeta está versionado en JSON. No hace falta una tabla nueva para agregar procedencia del plan importado.

- Permitir crear/activar una carpeta desde una copia editable de títulos, unidades, temas y orden de un aula autorizada sin exigir otro archivo de programa. Usar IDs propios y revisión de origen. Cambiar o quitar el vínculo no pisa el plan editado, los archivos ni el historial.
- Mantener materiales del aula como referencias vivas y propios como biblioteca privada. No duplicar bytes para copiar una referencia válida del chat.
- Un plan con títulos organiza el estudio, pero no sustituye fuentes legibles para IA. Mantener el resultado de información insuficiente cuando corresponda y la selección dentro del límite actual de fuentes.
- El producto permite consultar aulas archivadas a miembros vigentes; la maqueta las excluye. Para implementación, preservar la regla vigente y mostrar «Archivada · consulta» con capacidades correspondientes. Ese estado adicional queda sujeto a revisión visual.
- Repaso ya calcula/edita sesiones y las confirma idempotentemente en Agenda. Agregar consulta de solapamientos con ocurrencias propias y destino exacto evento→carpeta/plan usando `StudyReviewSession`. No introducir IA en un cálculo que hoy es determinista sólo para imitar la animación.

Fuentes: [reglas de Study](../../docs/engineering/study/README.md), [comandos](../../apps/api/src/modules/study/application/commands.ts), [fuentes](../../apps/api/src/modules/study/infrastructure/folders/sources.ts), [bridge Agenda](../../apps/api/src/bootstrap/study-agenda-integration.ts), [motor](../../src/core/domain/study/engine.ts).

### 4.5 Agenda, notificaciones y perfil

Agenda ya persiste color: trasladar la paleta y el editor sin perder colores anteriores, recurrencia, día completo, zona horaria o fecha real. Los avisos de choque son advertencias, no prohibiciones nuevas.

Notificaciones ya tiene lectura, lectura masiva, apertura con autorización, no leídas y paginación. Faltan:

1. Filtro por tipo aplicado antes de paginar y ligado al cursor firmado; conservar contador global de no leídas.
2. Cambio idempotente de leída a no leída y total servidor si la UI muestra «Todas».
3. Proyección conjunta de repasos y productores de invitación/ingreso al aula. Una invitación abre su revisión; nunca se acepta por abrir el aviso.
4. Definir cuándo se generan avisos de Agenda común: la fila fija de la maqueta no determina horario, anticipación o repetición.
5. Apertura de recurso revocado con mensaje genérico y salida útil. Retener detalles históricos tras revocación exige una política explícita; no inventarla en frontend.

Recomendación: reunir proyecciones autorizadas de dominios existentes. Una nueva tabla central sólo se justifica si se aprueba una bandeja histórica con retención propia; añade sincronización, duplicados y reglas de borrado. `Notification.classroom_id` obligatorio no debe relajarse sólo para incrustar eventos personales.

Perfil requiere conectar la nueva vista a `PATCH /account`, no otro modelo. Usar iniciales y los cuatro Foxy vigentes; las fotos de personas de la maqueta son fixtures. Conservar las operaciones reales de contraseña/sesiones en su contexto visual.

Fuentes: [cursor de notificaciones](../../apps/api/src/modules/home/infrastructure/notification-page.ts), [rutas](../../apps/api/src/bootstrap/academic-http.ts), [identidad](../../docs/engineering/identity/README.md), [Agenda](../../apps/api/src/modules/agenda/infrastructure/event-repository.ts).

## 5. Secuencia por entregables verificables

El siguiente trabajo se registra en un único TTP de implementación al autorizarlo; este documento no marca tareas productivas como realizadas. Cada unidad incluye UI, contrato necesario, pruebas y documentación juntas. Los responsables son áreas de trabajo, no asignaciones automáticas de agentes.

| Unidad / responsable | Depende de | Resultado y superficies | Puerta de aceptación |
|---|---|---|---|
| **P0 · coordinador + QA** | Aprobación de ejecución y decisiones bloqueantes | Congelar candidato/capturas y fixtures; reconciliar HEAD; inventariar contratos y estados; definir matriz por rol y ruta. | Trazabilidad completa, datos sintéticos reproducibles, baseline de pruebas existente y ninguna captura sin estado identificado. |
| **P1 · frontend** | P0 | Tokens finales consolidados, Nunito/assets, iconos, botones, contadores, avisos, diálogos y shell compartido. Navegación expandida/rail/móvil/foco. | Página piloto en ambos roles coincide; teclado/foco/zoom/móvil sin tapar contenido; autenticación y navegación existentes pasan. |
| **P2 · frontend + aulas** | P1 | Inicio, Mis aulas, invitaciones y creación de aula en cuatro pasos, búsqueda y estados. | Crear manual/IA, editar plan, guardar/retomar borrador, aceptar/rechazar/reintentar invitación y salir sin pérdida; actualizar pendientes reales. |
| **P3 · curriculum/materials/communication + frontend** | P2; decisión archivos para extensiones | Interior de aula, Plan, Muro, Biblioteca, miembros, historial y ajustes. Carga preparada y vínculos opcionales. | Temas dados y recursos relacionados persisten; aislamiento entre aulas; publicación atómica; archivo/fallo/reintento y estado archivado. |
| **P4 · activities + frontend + QA datos** | P3; contrato multitema/brief | Migración compatible y autoría manual/IA: selección visual, idea requerida, propuesta/rúbrica editables, borrador privado y confirmación. | Pruebas de migración e integridad, snapshot de fuentes, cero filtración de idea/claves, revisión obsoleta controlada; paridad visual de cada paso. |
| **P5 · participation/grading + frontend** | P4 | Actividad enfocada, autosave, archivos, entrega/recibo/historial, revisión/devolución y progreso. | Recorrido docente→estudiante→docente→estudiante con usuarios distintos; doble entrega/publicación idempotentes, nota privada y publicada, errores y recarga. |
| **P6 · agenda + frontend** | P1; P5 para destinos de actividad | Mes/semana/día, widget compacto y editor con color, confirmación y recuperación. | Eventos actuales intactos; zona horaria/recurrencia/día completo/fechas límite; edición reflejada entre vistas y ambos tamaños. |
| **P7 · foxy/study/files + frontend** | P3/P4/P6; decisiones contexto/cancelación/formatos | Chat amplio, contexto claro, paneles, mini biblioteca, creaciones→Biblioteca, carpetas visualmente iguales al wizard de aulas, plan→Agenda. | Fuentes y cuotas verificadas, revocación, hilo/contexto independientes, publicación y agendado idempotentes, historial y borrador preservados. |
| **P8 · home/communication/identity + frontend** | P2/P5/P6/P7 | Notificaciones unificadas con destinos exactos; perfil y preferencias. | Filtros sobre varias páginas, lectura reversible/masiva y contador; invitaciones vencidas/revocadas; guardar perfil/recargar/rollback sin afectar otro usuario. |
| **P9 · QA + coordinador** | P2–P8 | Comparación integral, corrección de diferencias, accesibilidad, fallos y regresión de capacidades vigentes; entrega candidata. | Toda la matriz aprobada, cero bloqueantes, migraciones y reversión comprobadas; informe con límites. Publicación sólo con autorización de destino. |

Se pueden adelantar Perfil y Agenda después de P1, porque su contrato principal ya existe. No paralelizar escritores sobre tokens, shell o el mismo componente. Camino crítico: P0→P1→P2/P3→P4→P5 y P7→P8→P9. No fijar fechas sin capacidad del equipo y resultados de P0/P4.

## 6. Verificación exigida para declarar «calco»

### Visual y responsive

- Misma fuente local cargada, assets y datos. Capturas de referencia en 1440×900 y 390×844; controles adicionales a 1024, 768 y 320 px y alturas 638/706. Añadir 200% de zoom y teclado móvil real.
- Recorrer todas las pestañas de aula, pasos de los wizards y diálogos, no sólo páginas iniciales. Capturar scroll intermedio/final cuando el contenido lo requiere.
- Comparar espaciados, radios, dimensiones, alineación de texto/iconos/contadores, jerarquía y truncamiento intencional. Texto largo y ausencia/abundancia de datos deben conservar el orden visual.
- Contraste de texto normal ≥4,5:1 y texto grande ≥3:1; comprobar también foco/controles e imágenes manualmente. Etiquetas accesibles, foco visible/restaurado, diálogo que contiene el foco, navegación por teclado y movimiento reducido.
- Ninguna barra fija, toast o teclado oculta la acción principal o el control enfocado. Scroll interno sólo cuando responde a una tarea (mensajes, historial, lista extensa); evitar contenedores vacíos de alto artificial.

### Recorridos funcionales mínimos

| ID | Recorrido y estados negativos |
|---|---|
| E01 | Aula manual/IA → plan revisado → invitación → estudiante acepta → ve sólo aulas autorizadas; código erróneo/vencido, plan fallido, guardar borrador fallido. |
| E02 | Tema → material/unidad/actividad → marcar dado → recarga; material reemplazado/no legible y pertenencia revocada. |
| E03 | Idea IA + varias unidades → generación → editar preguntas/rúbrica → guardar privado → confirmar publicación; revisión obsoleta, timeout, pesos inválidos. |
| E04 | Estudiante abre consigna → resuelve quiz/evaluación/TP → recupera borrador → confirma entrega → recibo; incompletas, archivo rechazado y doble clic. |
| E05 | Docente revisa → guarda corrección privada → publica → estudiante ve devolución correcta; cero, reintento, AI sugerida no aplicada y publicación fallida. |
| E06 | Evento crea/edita/color/elimina → Inicio y Agenda coherentes; fin anterior a inicio, recurrencia, día completo, cruce de día y zona. |
| E07 | Chat general → archivos propios → aula → nueva conversación → creación → Biblioteca; cuota, cancelación, fuente retirada, publicación duplicada. |
| E08 | Carpeta propia/vinculada → plan editable → biblioteca propia/viva → práctica → repaso → Agenda → volver al plan; desvincular, aula archivada, agendar dos veces. |
| E09 | Notificación filtrada/paginada → abrir destino → leída/no leída → leer todas; recurso perdido, invitación vencida, error y recarga. |
| E10 | Nombre/avatar → vista previa → guardar → navegación/recarga; cancelar y fallo de persistencia; contraseña/sesiones vigentes siguen operables. |
| E11 | Atrás/Adelante, enlace profundo y recarga conservan aula/actividad/carpeta/hilo; rutas o IDs ajenos se rechazan también en API. |

### Técnica, datos y operación

- TDD para reglas nuevas y regresiones: obtener RED por la causa real, después GREEN. No sustituir una prueba de permisos por una captura o por cambiar el rol en cliente.
- Ejecutar tests de feature y contratos afectados; `npm run api:build`, `npm run web:build`, `npm run lint:boundaries`, `npm run docs:check` y suites pertinentes de `test:ci`. `test:web` sólo cubre parte del cliente/proxy, no certifica todo el frontend.
- Para Agenda/Study y cambios de datos usar sus suites y una base descartable con casos preexistentes. No ejecutar helpers contra datos retenidos por conveniencia. Revisar qué levanta cada script antes de ejecutarlo.
- Verificar migración hacia adelante, concurrencia, idempotencia, errores parciales y compatibilidad de trabajos en curso. Pruebas automatizadas usan proveedores sintéticos; prueba con proveedor real separada y específicamente autorizada.
- Repetir recorridos con usuarios distintos y API real en entorno aislado. Medir tiempos de primera respuesta/archivo y mantener feedback honesto; no introducir polling sin fin o duplicación de trabajo al refrescar.
- Mantener documentación canónica, DTO/OpenAPI y parser/checks existentes. No borrar contratos para silenciar tests.

## 7. Activación, compatibilidad y reversión

Entregar por unidades pequeñas e integrables. Aplicar primero lectores compatibles, luego migraciones aditivas/backfill, finalmente nuevas escrituras. Activar pantallas por unidad sólo cuando su recorrido completo funciona; evitar mezcla de dos shells en un mismo flujo.

Para cambios puramente visuales se puede volver al componente anterior. Después de crear actividades interunidad, volver a un binario que sólo entiende una unidad no es seguro: retirar nuevas escrituras manteniendo lectura compatible o corregir hacia adelante. No borrar datos para hacer coincidir una reversión.

La entrega final debe incluir estado de integración, evidencia de la matriz, migraciones aplicables y límite de reversión. Commit, push, merge, publicación y despliegue se autorizan para un candidato y destino concretos; este plan no los concede.

## 8. Decisiones agrupadas antes del trabajo dependiente

La dirección visual y los flujos pedidos están definidos. Estos puntos faltan porque el HTML simula información que el backend necesita precisar:

| Decisión | Propuesta recomendada | Bloquea |
|---|---|---|
| Formatos y tamaños por propósito | Entregar primero el contrato actual; ampliar PPTX y luego DOC/PPT con extracción segura y límites visibles aprobados. Si la paridad de formatos completa es condición de salida, incluir esa ampliación en P3/P7 y no declararla terminada antes. | Extensiones de Biblioteca/mini biblioteca y extracción IA. |
| Contexto «todo el aula» | Resolver todas las fuentes elegibles en servidor, mostrar usadas/excluidas y pedir acotar al superar cuotas; actualizar para cada nueva generación sin alterar conversaciones pasadas. | Contrato de grounding P7. |
| «Detener» | Cancelación durable por dueño para trabajos que la soporten; mostrar el estado real y explicar cuando ya terminó. No presentar abortar observación como cancelación efectiva. | Control de jobs P7. |
| Avisos de Agenda común | Primera fuente: repasos durables existentes. Definir anticipación, repetición, zona horaria y bajas para eventos personales antes de crear nuevos avisos. | Parte de P8. |
| Avisos después de perder acceso | Mensaje genérico sin detalles protegidos, contadores derivados de contenido autorizado. Retención histórica detallada requiere política aparte. | Proyección y retención de bandeja. |
| Aula archivada y contexto | Preservar consulta autorizada del producto y mostrar estado archivado; no copiar el filtro restrictivo de la maqueta. | Estado adicional de carpeta/contexto P7. |

No requiere una decisión nueva de stack, un servicio de notificaciones nuevo ni una tabla de carpetas paralela. La revisión de estas decisiones y la autorización de ejecutar P0–P9 pueden hacerse juntas, con este documento y la maqueta como referencia concreta.
