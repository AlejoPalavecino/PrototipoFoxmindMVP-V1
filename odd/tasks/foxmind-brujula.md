# FoxMind Brújula: integración del kit aprobado

## Ampliación vigente: auditoría de paridad y publicación — 2026-11-05

Pedido explícito vigente: recorrer con Ego Light todas las pantallas y flujos, aplicar el HTML adjunto como referencia final, completar contratos necesarios y limpiar superficies/contratos realmente sin uso conservando negocio, seguridad y persistencia. Autorizados implementación, commits, push, integración en main y retiro de ramas integradas. El HTML adjunto es idéntico al versionado al normalizar CRLF. Esta autorización sustituye sólo el límite de publicación de entregas anteriores; no autoriza despliegue ni datos productivos.

| ID | Resultado | Estado | Responsable | Dependencia | Aceptación / evidencia |
|---|---|---|---|---|---|
| BRU-11 | Inventario de diferencias por pantalla, flujo y rol con Ego | DONE | root | HTML y pedido vigente | Capturas iniciales de ocho tabs y cuatro globales, asistente/autoría, [auditoría independiente de contratos](../../docs/work-log/2026-11-05-parity-contract-review.md); matriz de aceptación final pendiente en BRU-13 |
| BRU-12 | Paridad de presentación e interacción con contratos coherentes | DONE | root | BRU-11 | Contratos/UI/migraciones verificados en recursos propios; backend96 y web104 compilados; tipos y lint104 PASS; [evidencia](../../docs/work-log/evidence/2026-11-06-brujula-parity/README.md) |
| BRU-13 | Verificación funcional, visual responsive y revisión independiente | DONE | root | BRU-12 | Fast acumulado301/1655/0/0; SQL99 y E2E65/93/100/107 PASS; ambos roles, responsive390/768/1280/1440 y revisión independiente sin hallazgos abiertos. Ego cerrado119 |
| BRU-14 | Entrega publicada y main única | DONE | root | BRU-13 | Implementación107616bba9c342052005b459257fd3a7b29bcaa0 integrada por fast-forward y publicada; lectura remota exacta y rama integrada retirada, sólo main. Cierre documental posterior separado |

Las tablas DONE anteriores son evidencia histórica de su propio alcance, no aceptación de esta ampliación. Los datos personales/demo, credenciales, reloj fijo, cambio de rol demo y respuestas IA simuladas no se convierten en negocio real. Los estados reales de seguridad/errores/guardado se conservan con diseño coherente. No se elimina un contrato por estar ausente de una captura: primero se comprueban sus consumidores y su función de negocio.

Continuidad 2026-11-06: BRU-11–14 DONE. [Registro coordinador actual](../../docs/work-log/2026-11-05-id-unavailable-brujula-parity-audit.md) conserva los fallos y su resolución. Nueve escrituras del plan sin consumidores productivos retiradas; estado de temas y lecturas/historia conservados. E2E93 cerró el inicio desde Inicio, respuesta escrita, entrega y corrección; E2E107 repitió moderación/notificaciones/Biblioteca/progreso/reinicio y responsive sobre Web104. Se conservaron77 muestras y229 capturas en el archivo local completo. Implementación107616b integrada y publicada con ref remota comprobada, rama integrada retirada. Sin certificación automática pixel a pixel, proveedores reales ni base retenida. El cierre documental posterior no modifica producto.

## Alcance vigente: paridad integral y base de producto

Nuevo pedido del usuario del2026-11-05 autoriza revisar el HTML completo, login/registro y sus campos, botones, Inicio, creación de aulas/actividades y completar backend/lógica para datos faltantes. El diseño se establece como base de futuras implementaciones. La ampliación BRU-06–10 queda implementada y verificada localmente en el [registro vigente](../../docs/work-log/2026-11-05-id-unavailable-brujula-complete-base.md); los cierres BRU-01–05 que siguen son históricos. Se conserva stack, seguridad y datos reales; cambios derivados no requieren números ficticios ni persistencia de demo.

| ID | Resultado | Estado | Responsable | Dependencia | Aceptación/evidencia |
|---|---|---|---|---|---|
| BRU-06 | Inventario exhaustivo HTML→pantallas/campos/acciones/datos | DONE | root | HTML aprobado y nuevo alcance | Inventario por módulo debajo y auditorías atribuidas en registro vigente |
| BRU-07 | Datos faltantes calculados/autorizados desde backend | DONE | root | BRU-06 | Contratos, migración con notas históricas, búsqueda, Home y handoff verificados; revisión SQL independiente14PASS, Home10PASS y notificaciones5PASS |
| BRU-08 | Acceso y autoría alineados al HTML completo | DONE | root | BRU-06 | E2E completo nuevo1PASS: aula manual obligatoria, actividad3pasos, criterios, entrega, override y publicación; auth real y vistas responsive comprobadas |
| BRU-09 | Sistema visual base y resto de pantallas coherentes | DONE | root | BRU-06 |96capturas de la matriz/recorrido y10deInicio; muestras inspeccionadas, rúbrica legible en4anchos, acceso comparado con HTML, Ver listado integrado. Foco vacío corregido y geometría final320/375/1280PASS; [18muestras](../../docs/work-log/evidence/2026-11-05-brujula-complete/README.md) |
| BRU-10 | Verificación integral y entrega local | DONE | root | BRU-07–09 | Build API/Next/lint PASS, cobertura fast acumulada1616PASS y afectados29PASS;16casos integrados aprobados (nuevo1/Brújula1/matriz1/Home13), SQLHome15PASS y revisión independiente sin hallazgos abiertos. Alcance/límites y fallas históricas en registro vigente |

Decisión humana posterior: el aula **siempre requiere un plan**, escrito manualmente o analizado con IA. Se adapta el flujo al diseño HTML sin admitir aula sin plan. Un archivo es opcional cuando existe un plan manual válido; si se adjunta mantiene escaneo/propiedad. La rúbrica produce una sugerencia ponderada y la nota final sigue editable/publicable por el docente, sin recalificar historia. Los campos separados de actividad y Muro se implementan dentro del alcance de paridad autorizado.

Operación posterior autorizada: migraciones aplicadas a la base local habitual37→39, con backup y conservación de datos verificados; plataforma activa para revisión manual. [Registro de arranque](../../docs/work-log/2026-11-05-id-unavailable-brujula-local-start.md). No modifica los límites de las pruebas anteriores ni autoriza publicación remota.

Cierre posterior aprobado por el usuario: diseño aceptado, aplicación/servicios detenidos y entrega integrada en mainlocal mediante fast-forward. BRU-01–10 están contenidos en `0a5287507d9f5381e8c0212141a869e5aedf956c`; rama de trabajo retirada, único checkout y única rama localmain. [Registro de integración](../../docs/work-log/2026-11-05-id-unavailable-brujula-main-integration.md). Sin push ni eliminación de datos/configuración.

### Inventario integral vigente

La referencia completa se divide por módulos ejecutables. La evidencia de cierre se concentra en BRU-10 y el registro vigente. Guía de exploración, cuentas de ejemplo, reloj fijo y almacenamiento demo son herramientas de la maqueta, no funciones reales a portar.

| Módulo HTML | Correspondencia de producto | Resolución implementada |
|---|---|---|
| account/main | sign-in/register/verify/forgot/reset/profile/settings; navegación compartida | Auth43/57, fuente/assets y campos del HTML; contraseña repetida en restablecimiento/configuración, seguridad real conservada. Menú de cuenta comprobado en ambos roles |
| home-shared/docente-inicio | Home, HomeFocus, HomeModule, HomeMiniagenda | Borradores globales2+lista, próximo tema exacto, cero pendientes y agenda separada; GREEN9 Home |
| alumno-inicio | HomeWorkList, HomeRow, PublishedResult | Listado agrupado pendientes/cerradas/entregadas/devoluciones; privacidad del resultado publicado |
| classroom | Classrooms, Wizard, Plan, Library, Wall, roster, Progress | Alta2pasos con plan obligatorio, métricas derivadas, títuloMuro; mismas acciones de plan y biblioteca conservadas |
| activitywizard/activities | Activities, ActivityAuthoring, ActivityGeneration, AttemptSession | Manual3pasos sincrear alabrir, objetivo/comentario, criterios100, revisión/publicación; IA auténtica y fallback honesto |
| rubricreview | GradingEditor, PublishedResult, PublishedGradeCorrection | Puntajescriterios0–10, snapshot, sugerencia ponderada, finaleditable y publicación; historia inmutable |
| inbox | Notifications, /notificaciones | Vistarápida3, centro, filtros y lectura de todas mediante un batch atómico autorizado por destinatario |
| agenda | Agenda, EventForm, AgendaDay | Colores, preview, recurrencias y privacidad existentes; después del día consulta los31días siguientes y respeta paginación |
| resources/foxychat/studio | FoxyWorkspace, ResourceWorkspace, VisualWorkspace | Chat/contexto/fuentes/recurso/exportación existente; handoff idempotente a nuevo DRAFT revisado, sin publicación implícita |
| main/search | NavigationSearch y lectura autorizada de contenido | Aulas/temas/materiales/actividades, paginación con cursor firmado y destinos exactos verificados |
| guide/design assets | docs/design/brujula y CSS compartido | Basecanónica con tipografía, paleta, geometría, estados y componentes; sin selector de cuentas demo |

## Autoridad, alcance y diseño

Pedido directo del usuario del 2026-11-05 autoriza implementar el prompt del kit y la referencia visual para docente y alumno. Se conserva stack, semántica y permisos comprobados. Referencia extraída: C:/Users/alejo/Downloads/FoxMind-Brujula-Revision-20261105/FoxMind-Brujula-Kit/. La maqueta aporta diseño y flujos; sus datos y localStorage no se incorporan como persistencia. No autoriza publicación, datos retenidos ni secretos.

## Resultados verificables

| ID | Resultado | Estado | Responsable | Dependencia | Aceptación / evidencia |
|---|---|---|---|---|---|
| BRU-01 | Matriz MVP real y brechas de ambos roles | DONE | root | Kit aprobado | Componentes, casos de uso, servicios y contratos identificados; matriz debajo |
| BRU-02 | Navegación y sistema visual Brújula | DONE | root | BRU-01 | Fuente/assets del HTML, cascada corregida, sidebar consistente. Matriz real64 capturas y8 Inicio; QA visual escritorio/móvil, tipos/lint/build aprobados |
| BRU-03 | Inicio por rol y recorridos académicos | DONE | root | BRU-02 | Home final13/0/0 y Brújula1 aprobados; selección contextual, dos etapas, edición DRAFT, rúbrica pública y entrega por intento |
| BRU-04 | Agenda y Foxy integrados | DONE | root | BRU-02 | Agenda previa/color E2E; Foxy38 focales, guardas de primer envío/esquema/breadcrumb y revisión independiente51/0/0. Sin proveedor real |
| BRU-05 | Verificación y entrega local | DONE | root | BRU-03, BRU-04 | Fast serial1538/0/0, Home13/0/0, recorridos reales y72 capturas; revisión independiente sin hallazgos abiertos. Evidencia/limitaciones en registro de fidelidad |

## Matriz inicial → final

| Pantalla / acción | Componente actual | Caso de uso / servicio → endpoint | Estado inicial / brecha | Solución / estado final |
|---|---|---|---|---|
| Navegación ambos roles | AppNavbar, NavbarParts | Sesión verificada; Notifications → /notifications | Sidebar parcial, presentación anterior y sin búsqueda | Unificar shell Brújula conservando sesión/avisos |
| Inicio docente | Home, HomeModule, HomeTeacherTools | HomeClient → home; módulos review/queries/agenda/classrooms | Datos reales, herramientas contextuales existentes sin montar; revisión agrupada por actividad | Exponer acciones reales, comparar intento específico |
| Inicio alumno | Home, HomeRow | HomeClient → pending/feedback/agenda | Pendientes propios y feedback publicado; texto Continuar ambiguo | Etiquetas de borrador y diseño alumno |
| Mis aulas / aula | Classrooms, ClassroomView | ClassroomClient → classrooms, plan, wall, library, progress, members | Ocho/seis secciones reales existentes | Trasladar tokens y portadas sin alterar permisos |
| Actividad manual / IA | Activities, ActivityAuthoring, ActivityGeneration | activities, preview, generation y publicación explícita | Entradas manual/IA inline; borradores y revisión existentes | Modal de elección y conservar pipeline real |
| Entregas / corrección | AttemptSession, AttemptHistory, GradingEditor | Intentos propios, revisión privada, publicación | Existe; pendiente nueva prueba con persistencia | Reutilizar contratos y verificar recorridos |
| Foxy docente | FoxyWorkspaceSession, FoxyWorkspace | Chat persistente, fuentes, recursos y publicación confirmada | Existe chat/contexto, herramientas dispersas | Diseño Brújula sobre capacidades reales |
| Agenda ambos roles | Agenda, EventColorFields | AgendaClient → eventos privados, recurrencias | Colores reales, falta tarjeta previa del evento | Vista previa derivada del formulario |
| Cuenta / notificaciones | AccountNavbar, Notifications | AccountClient y ClassroomClient | Existen; conservar exclusividad y lectura privada | Integrar en sidebar |

## Reglas y riesgos

No agregar tablas para datos derivados. Nuevos contratos o migraciones solo ante brecha demostrada. Nunca confundir avance del plan con notas ni cumplimiento; notas privadas hasta publicación docente. Los tests sintéticos no prueban persistencia. No declarar DONE sin evidencia aplicable observada.

## Evidencia y continuidad

[Registro vigente de fidelidad](../../docs/work-log/2026-11-05-id-unavailable-brujula-fidelity.md); [primera entrega histórica](../../docs/work-log/2026-11-05-id-unavailable-brujula.md). Referencia conservada en [docs/design/brujula](../../docs/design/brujula/README.md). Implementación y verificación local completadas. Siguiente acción: revisión humana del diff y las capturas; no hay autorización de publicación. Sin bloqueos confirmados dentro del alcance.

## Contraste final y aceptación

| Área | Implementación final / evidencia |
|---|---|
| Navegación y búsqueda | AppNavbar/NavBarParts/NavigationSearch; una sidebar, logo/typografía del kit, búsqueda sobre destinos autorizados, perfil/configuración/notificaciones. E2E real verifica filtro sin acentos, Escape, preservación del drawer y foco; sin índice global de contenidos privados |
| Inicio docente | Misma API `/api/v1/home`, consulta SQL por intento con nombre, número, fecha y destino exacto; sin duplicación. Herramientas con selección real de aula. Home13 y proyecciones SQL13 aprobados |
| Inicio alumno | Mismos pending/feedback autorizados, Continuar borrador y Leer devolución; publicación privada/pública probada en recorridos reales; prórrogas y reinicio probados |
| Aulas y espacios | Classrooms/ClassroomView, plan/muro/biblioteca/actividades/progreso/alumnos o compañeros, historia/configuración solo docente. Tokens y portadas Brújula, temas no ilustrados conservan portada previa. Dos roles, cuatro anchos y catorce secciones comprobados |
| Crear manual / IA | Modal de elección sin crear borrador al abrir. Editor revisa y guarda; Asignar al aula exige guardar y confirmar. Nueva propuesta IA incluye criterios públicos editables; aplicar solo crea DRAFT. Adapter de IA determinista usado únicamente en tests |
| Rúbrica | `evaluationRubric` público distinto del texto privado `aiGradingRubric`. Criterios/pesos100 validados en UI/proxy/servidor; SQL confirma persistencia y privacidad; E2E edita por UI y consulta según publicación |
| Corrección | HomeTarget incluye attemptId y abre ese editor; revisión privada, nota explícita y publicación separada conservadas. Peso de criterios orienta la rúbrica, no altera fórmula de nota histórica |
| Foxy AI | Chat/contexto/fuentes/publicación existentes; nuevo panel lateral selecciona herramientas reales. Disponibilidad se informa honestamente, sin simular respuestas. SQL de conversación/contexto/publicación complementa controladores; no llamada nueva a proveedor real |
| Agenda | Mes/semana/día y recurrencias existentes; vista previa del formulario con nombre/color/fecha/horario. E2E persiste PURPLE; SQL confirma privacidad/CAS/recurrencias |
| Cuenta y avisos | Contratos vigentes, correo/rol no editables; notificaciones por sesión y lectura privada; Home13 verifica deep link, revocación y recuperación offline |

## Cambios de API y persistencia

| Acción | Endpoint reutilizado |
|---|---|
| Inicio y colas paginadas | `GET /api/v1/home`, `GET /api/v1/home/modules/:module` |
| Catálogo / detalle del aula | `GET /api/v1/classrooms`, `GET /api/v1/classrooms/:classroomId` |
| Plan / Muro / Biblioteca | `/api/v1/classrooms/:classroomId/plan`, `/wall`, `/library` |
| Guardar y asignar actividad | `POST /api/v1/classrooms/:classroomId/activities`, `GET .../activities/:activityId/preview` |
| Proponer y aplicar con IA | `/api/v1/classrooms/:classroomId/activity-generations`, `.../:generationId/apply` |
| Sesión / borrador / entrega | `.../activities/:activityId/session`, `.../attempts/:attemptId/answer`, `.../submit-practical` y entrega de cuestionario existente |
| Corrección privada / publicación | `/api/v1/classrooms/:classroomId/attempts/:attemptId/grading`, `.../publish-grade` |
| Progreso personal / docente | `/api/v1/classrooms/:classroomId/progress`, `.../members/:studentId/progress`, con autorización de servidor |
| Avisos privados | `/api/v1/classrooms/notifications/page`, `.../:id/open`, `.../:id/read` |
| Eventos privados | `/api/v1/agenda/events/:eventId`, con PUT/PATCH y revisión según contrato existente |
| Foxy | `/api/v1/foxy-ai/conversations`, recursos `/resources/:id` y preparación/publicación explícita `/publications` |

El alcance inicial BRU-01–05 reutilizó endpoints. La ampliación BRU-06–10 agrega búsqueda `GET /classrooms/search`, handoff revisado `POST /foxy-ai/resources/:id/activity-draft` y batch autorizado `POST /classrooms/notifications/read-all` (todos bajo `/api/v1`). Contratos HomeTarget/ReviewItem y actividad/propuesta IA actualizados junto con sus clientes. La lectura nueva admite payloads anteriores, pero el cliente Home antiguo era estricto y puede rechazar campos nuevos: API y web deben entregarse coordinadamente y las pestañas anteriores recargarse. El módulo review cuenta intentos, una modificación semántica explícita. Migraciones aditivas `202611050001_public_evaluation_rubric` y `202611050002_brujula_activity_grading_wall`: criterios públicos separados, campos adicionales y puntuación/snapshot; backfill conserva notas anteriores, sin reescritura del texto privado. Cliente antiguo de autoría que omite el campo no lo borra. Migraciones aplicadas solo a fixtures propios; no sobre base retenida. [Contrato operativo de rúbrica](../../docs/engineering/activities/README.md#rúbrica-pública-de-brújula).

## Límites explícitos

- Sin proveedor real, cuotas pagas, participantes reales ni datos retenidos. La propuesta IA se verificó con proveedor determinista solo en pruebas; no se presenta como evidencia de calidad de un modelo real.
- No se declara comparación pixel a pixel automática. Se revisan capturas reales y geometría; [muestras conservadas](../../docs/work-log/evidence/2026-11-05-brujula/README.md).
- El escenario histórico P9 de membresías presupone una cuenta con roles mixtos y falló; queda atribuido como incompatible, no aprobado ni eliminado. La política vigente de rol exclusivo y pruebas actuales de revocación/compañeros se mantienen.
- No se ejecutan todos los grupos de la suite completa; se documentan selecciones, fast y E2E realmente observados. Sin commits, merge, push ni despliegue.

## Reapertura por fidelidad visual — 2026-11-05

El usuario rechazó las diferencias de diseño de la primera entrega y pidió igualdad con el HTML. Los resultados anteriores son históricos y no validan el candidato nuevo. Se reabren BRU-02–05: fuente estática con síntesis de negritas, dimensiones y cascada CSS, sidebar/menú móvil, Inicio contextual y rail por rol, catálogo/interior, dos pasos de autoría manual, borradores editables, Agenda, perfil y Foxy. [Registro y evidencia vigente](../../docs/work-log/2026-11-05-id-unavailable-brujula-fidelity.md). No hay autorización de publicación.

Cierre de reapertura: BRU-02–05 DONE con Fast1538/0/0, Home13/0/0 y ambos recorridos Brújula aprobados. Se revisaron capturas del build nuevo y se conservaron [15 muestras reales](../../docs/work-log/evidence/2026-11-05-brujula-fidelity/README.md). Fuente del kit, paleta, formas, composición, navegación y flujos revisados para ambos roles. No se certifica igualdad pixel a pixel; las métricas no provistas por el contrato del catálogo no se inventan. Rúbrica desde Foxy sigue siendo propuesta editable, con asociación/publicación explícita en la actividad. Los resultados SQL previos permanecen atribuidos a su ejecución original. Sin decisiones nuevas pendientes ni publicación autorizada.

### BRU-12 · ampliación de Biblioteca escrita (2026-11-06)

El alcance vigente autoriza los contratos necesarios para editar contenido como en el HTML. La edición TEXT publica una nueva revisión con archivo aprobado; las actividades/citas existentes conservan materialId/fileId históricos. No se sobrescriben blobs ni se trasladan vínculos automáticamente. Relación única anterior→actual, guardas docente/aula activa/CAS y recuperación idempotente del mismo archivo+metadatos. El servidor comprueba SHA-256 del generador DOCX determinista frente al digest escaneado. Biblioteca/Plan/búsqueda/fuentes nuevas muestran revisión vigente; enlaces históricos siguen autorizados. Migración aditiva, sólo fixtures propios. Criterios: edición Unicode/multilínea coherente, denegaciones sin mutación, revisión obsoleta/concurrente sin duplicados, reintento estable, vínculos y descargas históricas intactos. SQL10PASS parcial; E2E/UI/auditoría final pendientes.

### BRU-12 · resolución completa y respuesta escrita (2026-11-06)

IN_PROGRESS, responsable coordinador. Depende del diseño HTML vigente, sin dirección visual nueva. La autorización actual del usuario incluye terminar, verificar, crear commits, integrar/publicar main y dejar sólo main; las restricciones de publicación citadas en cierres anteriores corresponden a sus entregas históricas.

Resultados exigidos: consulta sin inicio; acción explícita de respuesta inicia mediante el puerto académico existente; todas las preguntas visibles simultáneamente, guardado serializado y confirmación separada de entrega; cierre/cambio de destino invalida preparaciones pendientes; ficha del alumno con plazo efectivo. TP guarda texto Unicode de hasta5.000 caracteres, conserva CAS/editor/permisos, privacidad del borrador, texto confirmado en corrección/historia, copia a nuevo borrador de reentrega y evidencia IA separada de consigna. No se amplían las autorizaciones de despliegue/proveedores/datos retenidos.

Evidencia parcial observada: `parity-close-preparation-green-23.log`32 PASS; `parity-effective-deadline-green-21.log`3 PASS; `parity-practical-contracts-green-31.log`17 PASS; `parity-practical-response-green-34.log`14 PASS SQL real con limpieza0. API32 PASS. Web35, nuevos E2E y auditoría Ego del candidato recompilado pendientes. El helper P9 histórico permanece congelado; el recorrido actual de cuestionario/evaluación se adapta al formulario aprobado. No marcar DONE por implementación o por estos grupos parciales.
