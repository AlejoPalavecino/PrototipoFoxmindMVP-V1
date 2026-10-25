# FoxMind 3D — migración local completa D0–D10

**ESTADO_DISENO: LISTO_PARA_TDD_RED.** El pedido humano actual autoriza implementación local completa y trabajo delegado. La confirmación L3 está satisfecha. El [plan de diseño](../../docs/design/foxmind-3d/implementation-plan.md) conserva su contexto histórico de diseño; esta tarea define la ejecución. Ninguna etapa queda aceptada por existir un mockup o por pasar pruebas anteriores a esta migración.

**Ejecución posterior coordinada:** D1–D9 implementados y verificación local observada; [guía actual](../../docs/foxmind-3d.md), [mapa de los82ID/niveles de evidencia](../../docs/foxmind-3d-verification.md) y [registro coordinador](../../docs/work-log/2026-10-25-root-visual-migration.md). El DoR y el checklist siguientes conservan su historia de diseño; no convierten los casos de plataforma/performance no observados en PASS. Juicio dual aprobado sobre9ad34da620d1336700a88dccf5fabeb78f3689d9; hoja L1 de movimiento y entrega local se registran por separado.

Base reconciliada: `eecb769151b12abb5ae9e1f15839b54c772e446f`; diseño sobre main `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`. El coordinador creó `codex/foxmind-3d-migration` en el checkout compartido. Sin push, despliegue, secretos, Gemini real ni cambios de datos retenidos. Se mantiene Next Pages Router, React/TypeScript estricto, servicios y tablas actuales; cambiar stack no mejora este alcance.

## Decisiones y DoR

| Dimensión | Decisión cerrada y comprobación exigida |
|---|---|
| Datos/idempotencia | Ilustraciones nunca aportan datos. Preservar operaciones y claves existentes; doble envío, publicación, aplicación IA y comprobantes mantienen su idempotencia. No migración DB para este rediseño. |
| Estados | Plan es la entrada ordinaria del aula; un destino explícito prevalece. Archivo conserva historia y solo lectura. Loading/error/empty/not-applicable son distintos. |
| Fallos | Inicio falla por módulo; identidad o participación no comprobable impide adivinar rol. Un fallo de imagen conserva contenido y controles. IA fallida conserva camino manual y dirty local. |
| Concurrencia | Mantener CAS/revisiones/editor locks; respuestas canceladas o de cuenta anterior no se aplican. Lecturas Home nunca abren intentos, guardan borradores ni marcan notificaciones. |
| Permisos | Rol por aula activa: propietario docente o matrícula con periodo activo. Invitaciones/borradores/archivadas no cuentan como participación activa. Cada apertura y mutación revalida servidor. |
| GRASP | Contratos puros primero en core; Home es proyección, sin segunda implementación de notas/plazos. Usar barriles y helpers públicos; módulos nuevos <200 líneas y funciones <40; unidades revisables <=400 líneas. |

Supuestos técnicos reversibles: un namespace CSS nuevo, 120–180 ms de transición suave sin mover layout, 90 días de miniagenda (dentro del máximo actual de 93), cinco filas por cola y tres de miniagenda. `prefers-reduced-motion` desactiva movimiento. No hay duda de negocio pendiente ni una nueva aprobación de implementación.

Compatibilidades observadas que deben resolverse explícitamente:

- No existe `apps/classrooms-ui/index.ts`; `api.ts` y `ClassroomsApp.tsx` son superficies públicas actuales. Añadir el barrel mínimo al integrar Home, sin reorganizar todo el módulo.
- `AgendaService.upcoming` contiene solo plazos académicos. Home debe unir eventos privados y plazos en servidor; no renombrar ese endpoint como si ya fuera miniagenda.
- `Home.tsx` actual contiene aulas/novedades, no colas. La nueva UI espera el contrato real antes de mostrar contadores.
- `ClassroomView` abre actualmente `members`; cambiar el default a `plan` sin sobrescribir actividad, hilo, resultado ni entrega dirigidos.
- `policy.ts` valida solo `explore/create/discover`; la DB guarda texto. D3-COV amplía diez claves válidas sin modificar registros antiguos; activar siete elecciones después del lector/validador compatible.
- IA admite 30 preguntas totales/hasta 30 por subtipo; el control actual limita cada subtipo a 10. Corregir UI y prueba de suma. Actualizar copia de preview y advertencia `GROUNDING_REQUIRES_REVIEW`; no relajar validador servidor.

## Contrato compartido exacto S0

Crear `src/core/domain/{home.ts,home-validation.ts,home-ports.ts,classroom-cover.ts}` y exportar desde `index.ts`. Mantener parsers explícitos puros como Agenda, sin introducir Zod nuevo. Separar tipos de filas si `home.ts` excede 200 líneas. Fechas ISO UTC, UUIDs opacos, revisiones decimales en string; nunca respuestas, claves correctas, token editor, email ajeno ni descripción privada de evento en el resumen.

```ts
type Participation = 'study' | 'teach' | 'mixed' | 'none';
type HomeModuleName = 'pending' | 'review' | 'feedback' | 'agenda'
  | 'queries' | 'materials' | 'classrooms';
type HomeRole = 'teacher' | 'student';
type HomeActivityType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
interface HomeRoom {
  id: string; name: string; division: string; subject: string;
  role: HomeRole; coverKey: string; archived: boolean; timeZone: string;
}
type HomeTarget =
  | { kind: 'classroom'; classroomId: string; section: 'plan' }
  | { kind: 'activity'; classroomId: string; activityId: string }
  | { kind: 'submissions'; classroomId: string; activityId: string;
      filter: 'unpublished' }
  | { kind: 'grade'; classroomId: string; activityId: string;
      attemptId: string; gradeId: string }
  | { kind: 'wall'; classroomId: string; postId: string }
  | { kind: 'material'; classroomId: string; materialId: string }
  | { kind: 'create-activity' | 'upload-material' | 'publish-notice';
      classroomId: string }
  | { kind: 'private-event'; eventId: string; occurrenceId: string;
      date: string };
interface HomeItem { id: string; title: string; target: HomeTarget }
interface PendingItem extends HomeItem {
  classroom: HomeRoom; activityType: HomeActivityType;
  state: 'first-submission' | 'resubmission'; attemptId: string | null;
  deadlineAt: string | null; reception: 'open' | 'closed'; late: boolean;
}
interface ReviewItem extends HomeItem {
  classroom: HomeRoom; activityType: HomeActivityType;
  needsReview: number; readyToPublish: number; oldestSubmittedAt: string;
}
interface FeedbackItem extends HomeItem {
  classroom: HomeRoom; activityType: HomeActivityType;
  attemptNumber: number; finalGrade: string; publishedAt: string;
  changedAt: string; availability: 'available';
}
interface QueryItem extends HomeItem { classroom: HomeRoom; updatedAt: string }
interface MaterialItem extends HomeItem {
  classroom: HomeRoom; publishedAt: string; extension: string;
}
interface AgendaItem extends HomeItem {
  source: 'PRIVATE_EVENT' | 'ACADEMIC_DEADLINE'; startAt: string | null;
  date: string; timeZone: string; allDay: boolean;
  classroom: HomeRoom | null;
}
interface ClassroomItem extends HomeItem { classroom: HomeRoom }
type HomePage<T> =
  | { status: 'ready'; items: T[]; totalItems: number | null;
      nextCursor: string | null }
  | { status: 'error'; code: 'SERVICE_UNAVAILABLE'; retryable: true }
  | { status: 'not-applicable' };
interface HomeModules {
  pending: HomePage<PendingItem>;
  review: HomePage<ReviewItem> & { totals?: {
    attempts: number; needsReview: number; readyToPublish: number } };
  feedback: HomePage<FeedbackItem>; agenda: HomePage<AgendaItem>;
  queries: HomePage<QueryItem>; materials: HomePage<MaterialItem>;
  classrooms: HomePage<ClassroomItem>;
}
interface HomeResponse {
  version: 1; subjectId: string; generatedAt: string; timeZone: string;
  participation: Participation;
  memberships: { study: number; teach: number; archived: number };
  setup: { drafts: number; invitations: number };
  modules: HomeModules;
}
interface HomeQuery { timeZone: string }
interface HomePageQuery extends HomeQuery {
  module: HomeModuleName; cursor: string | null;
}
interface HomeModuleResponse<M extends HomeModuleName = HomeModuleName> {
  subjectId: string; generatedAt: string; module: M; page: HomeModules[M];
}
interface HomeActor { userId: string; now: string }
interface HomeReadPort {
  participation(): Promise<Pick<HomeResponse,
    'participation' | 'memberships' | 'setup'>>;
  page<M extends HomeModuleName>(module: M,
    query: HomePageQuery): Promise<HomeModules[M]>;
}
interface HomeUnit { actor: HomeActor; read: HomeReadPort }
interface HomeUnitOfWork {
  run<T>(request: unknown, write: boolean,
    operation: (unit: HomeUnit) => Promise<T>): Promise<T>;
}
```

API pública de implementación, exportada exactamente desde `apps/api/src/home/index.ts`:

```ts
interface HomeSql {
  query<T>(sql: string, ...values: unknown[]): Promise<T[]>;
}
interface HomeRawTransaction {
  $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T>;
}
interface HomeDatabase {
  $transaction<T>(operation: (tx: HomeRawTransaction) => Promise<T>,
    options: { maxWait: number; timeout: number }): Promise<T>;
}
type HomeAuthentication = (tx: HomeSql, request: unknown,
  write: boolean) => Promise<string>;
interface HomeService {
  read(request: unknown, input: unknown): Promise<HomeResponse>;
  page(request: unknown, input: unknown): Promise<HomeModuleResponse>;
}
declare function createHomeService(uow: HomeUnitOfWork): HomeService;
declare function createHomeUnitOfWork(database: HomeDatabase,
  authenticate: HomeAuthentication): HomeUnitOfWork;
```

`createHomeService` depende solo del puerto, hace parse estricto antes de `uow.run(request,false,...)`, participación primero y páginas secuenciales; produce version/subjectId/generatedAt de actor. `page` recibe el objeto exacto HomePageQuery (el handler incorpora el módulo del path, no acepta otro módulo query). Fake de unit tests implementa HomeUnitOfWork.run invocando operation({actor,read}) con reloj/filas controlados; no necesita Prisma, Nest, red ni archivos. `createHomeUnitOfWork` real adapta Prisma en un punto (`raw.$queryRawUnsafe<T[]>`), autentica y crea HomeReadPort SQL con savepoints por page; el read port no se construye en el cliente. Las firmas no requieren nuevas credenciales. Reutilizar `createAgendaAuthentication` exportado al componer, que ya implementa la firma tx/request/write. El runtime exporta además `installHomeTransport` desde host.ts siguiendo el patrón de Agenda y registra el servicio en application.ts; pruebas unitarias importan solo factories/contratos, no el host.

`parseHomeQuery(unknown): HomeQuery`, `parseHomePageQuery(unknown): HomePageQuery`, `parseHomeTarget(unknown): HomeTarget`, `parseHomeResponse(unknown): HomeResponse` y `parseHomeModuleResponse(unknown): HomeModuleResponse` rechazan extras, UUID/fechas/zona/enum/cursor inválidos. `HomeError.code` permite `INVALID_INPUT|FORBIDDEN|SERVICE_UNAVAILABLE`; errores de identidad conservan códigos originales. La validación de un target solo verifica forma: el endpoint existente del recurso conserva la autorización. Review.totals solo aparece en status ready y debe sumar exactamente needsReview + readyToPublish.

`classroom-cover.ts`: `CLASSROOM_COVER_KEYS = ['explore','create','discover','literature','math','biology','society','science','creative','general'] as const`; `ClassroomCoverKey` derivado; `isClassroomCoverKey(unknown)`; `classroomCoverAsset(key:string)` devuelve una de las siete claves gráficas. Aliases históricos explícitos; desconocida → general solo al presentar, no al escribir. API valida con este contrato y el cliente lo consume; no duplicar enums.

## HTTP, puertos y límites de composición

- `GET /api/v1/home?timeZone=<IANA>` → `HomeResponse`; consulta desconocida/repetida inválida. Zona sugerida por navegador, fallback explícito UTC. Sin actor/query de rol suministrados por cliente.
- `GET /api/v1/home/modules/<module>?timeZone=<IANA>[&cursor=<opaque>]` → `HomeModuleResponse`. Permite reintentar un módulo y abrir un panel completo paginado dentro de Inicio. `Ver todas` solo aparece al existir ese panel y continúa con el mismo módulo/filtro; nunca envía a un listado genérico que pierde contexto.
- Respuesta `Cache-Control:no-store`, JSON, sin URL arbitraria. Método/ruta desconocidos conservan 404/405; identidad sin verificar y sesión vencida son error global, no siete errores de widget. Cliente usa credenciales same-origin y AbortController; presupuesto nuevo de proxy/cliente 30 s, sin alterar los existentes de API/Next/fixtures.
- Backend `apps/api/src/home/`: barrel `index.ts`, `service.ts`, `unit-of-work.ts`, `queries-{participation,pending,review,feedback,content}.ts`, `miniagenda.ts`, `http.ts`, `host.ts`, `cursor.ts`. Composición en `application.ts`; exportar helpers de aulas/Agenda desde sus barriles cuando sean necesarios. Prohibido importar implementación interna entre features. No nuevo endpoint home/open ni copia de reglas de autorización de recursos.
- UoW de solo lectura usa la autenticación verificada actual, reloj de servidor y transacción de 6 s/maxWait 2 s actuales. Consultas por módulo con joins de permiso en SQL y límites; no cargar todas las aulas/actividades para filtrar JS. Cada módulo usa savepoint: un error SQL recuperable se revierte a su savepoint y produce solo su `error`; identidad/timeout de transacción aborta el agregado completo. Revalidar identidad y huella del alcance activo antes de responder; si cambió, descartar respuesta completa con error seguro. No sostener locks de todas las aulas ni prometer snapshot transaccional entre páginas.
- Máximo 1 petición agregada inicial; siete consultas de página acotadas más participación/setup y revalidación. Sin N+1 por aula, estudiante o intento. SQL puede usar count/CTE agregado para total exacto, pero cada resultado de filas lleva `LIMIT 6` (3+1 en miniagenda); count no se deduce de ese límite. No fan-out navegador.
- Cursores firmados del lado servidor con infraestructura existente, sin nueva clave persistida: atados a actor, módulo, zona y orden, máximo 2048 caracteres. No offsets ni SQL libre. Una página nueva usa permiso/reloj actuales; deduplicar por ID al añadir, reiniciar tras mutación. No prometer snapshot inmutable.

## Semántica exacta de Inicio

| Módulo | Fuente autorizada, total y orden |
|---|---|
| Participación | `classrooms.teacher_id` para Enseño; `enrollments` + `membership_periods.ended_at IS NULL` para Estudio; excluir propias del brazo estudiante y `archived_at IS NOT NULL`. Counts exactos por aula distinta. Archivadas autorizadas aparte. Borradores propios no publicados e invitaciones propias pendientes/no vencidas se cuentan como setup, no membresía. |
| Pendientes | Solo `activities.status=PUBLISHED`, aula activa, matrícula activa propia y `student_activities.is_expected`. Último intento inexistente o DRAFT: primera entrega, o reentrega si número >1. Último SUBMITTED sale de cola aunque no tenga nota. Un intento TP abierto solo para consulta sin obligación no entra. Total exacto de actividades, no temas/intentos. Orden bloque vencidos primero, luego fecha ascendente, sin fecha al final, desempate activityId; fecha efectiva del servidor. |
| Recepción | Reutilizar/exportar política actual: máximo entre deadline general e individual; individual del último intento o first_submission_deadline_at. `late = now >= deadline`; abierto si no venció o allowLate. Cerrado sigue obligación pendiente, CTA Consultar y explicación del plazo; jamás botón Entregar habilitado por Home. Puntualidad histórica usa primera entrega confirmada y no se recalcula. |
| Revisión | Aulas propias activas; todo intento SUBMITTED aún sin `attempt_grades.is_published=true`, incluidos intentos históricos de estudiantes que salieron. Agrupar por actividad, no alumno/notificación. `needsReview`: no hay corrección guardada completa; `readyToPublish`: corrección privada persistida con final_grade no null y todas las filas/puntos de pregunta completos según publicación actual. Sin grade guardado, incluso test autocorregible requiere revisar. Intentos publicados se excluyen aunque otro intento esté pendiente. TotalItems = grupos de actividad; totals.attempts = needsReview + readyToPublish, exactos. Orden oldestSubmittedAt/id ascendente; abrir lista real filtrada unpublished. Cero es nota completa, no null. |
| Devoluciones | Solo resultado efectivo propio `student_activities.effective_grade_id` cuyo grade es publicado y actividad sigue accesible. Una reentrega abierta no oculta ese resultado: mostrar número de intento publicado. Una corrección actualiza changedAt; ordenar changedAt/gradeId descendente. Una publicación histórica que no es efectiva no reaparece como resultado vigente. Total exacto por actividad; etiqueta Disponible, sin inventar Leída; resultado detallado usa getAttemptResult autorizado sin claves privadas. |
| Consultas recientes | Solo QUERY no removida en aulas propias activas; ordenar última creación/edición de texto o respuesta no removida, luego postId descendente. No afirmar Sin responder ni confundir con avisos. Resumen título seguro de longitud acotada, sin datos extra; abrir hilo exacto. TotalItems null, hay más vía cursor. |
| Material reciente | Material no eliminado de aulas activas autorizadas y archivo listo/approved/clean/custodia íntegra; `created_at` como publishedAt, no updated_at por renombre. No seguimiento de apertura: nunca Retomar ni porcentaje. Orden created_at/materialId descendente; acceso de archivo protegido al abrir. TotalItems null; el resumen no incrusta contenido ni URL privada. |
| Miniagenda | Misma política/expansión de Agenda, dueño de eventos privados y plazos autorizados con override; siguientes tres inicios futuros a partir de now dentro de 90 días, orden instante/id. Para ALL_DAY usar fecha local y próxima medianoche inicial; hoy ya comenzado no se presenta como futuro. Explicar ventana «Próximos 90 días»; vacío no promete que no haya eventos fuera. Mantener IANA de cada evento y zona de vista. No reutilizar upcoming académico para fingir privados. TotalItems null; abrir Ver Agenda siempre. |
| Aulas/atajos | Cinco cards, activas antes de archivadas, nombre/id estable; historial archivado visible con enlace Mis aulas. Atajos docentes eligen una aula activa con nombre/división y permiso actual; varias usan selector local paginado de classrooms filtrado por role teacher, nunca selector global de rol. Una sola conserva destino visible. Crear aula/Unirse siempre disponibles para verificado y reutilizan flujos actuales. |

La página adicional de `classrooms` permite filtro de UI local sobre filas recibidas pero no busca aulas no cargadas; para seleccionar todas las docentes, continuar cursor hasta encontrarla o usar Mis aulas. Evitar anunciar «sin aulas» porque una página filtrada no contiene docentes. No añadir filtros de API sin parser/test de contrato.

Persistencia de UI: skeleton solo local antes de respuesta; `not-applicable` solo cuando participación fue comprobada y ese rol no existe. Si falla participación, el agregado falla y no muestra una falsa variante none. Un módulo error retira sus filas/total antiguos, conserva su espacio y ofrece Reintentar; se elige no conservar datos stale, evitando afirmar autorización actual de datos viejos. Al perder permiso/salir/archivar/cambiar sesión se borran módulos afectados inmediatamente. Refresco al entrar, tras mutación pertinente y al foco si última respuesta tiene >=60 s; sin polling. Abortar/fijar generation por cuenta y descartar respuestas tardías. Mixto muestra ambos trabajos; solo archivadas es participación none con historial, no clase inventada.

## Destinos y compatibilidad de navegación

La apertura Home se pasa como `HomeTarget` tipado a `ClassroomsApp`/`ClassroomView`; cada adaptador llama al endpoint actual de su recurso, que revalida sesión/membresía. Actividad y grade reutilizan `NotificationTarget`; submissions abre `AssignmentSubmissions` o historial real con filtro unpublished; wall, el post exacto; material, Biblioteca y archivo contextual autorizado; atajos abren formulario real después de cargar detalle de aula y comprobar rol/archivo. `onOpenHomeTarget(target)` nunca aplica/publica automáticamente y conserva la semántica actual de abrir TP. Mantener CTA de inicio de cuestionario/evaluación en su flujo actual. Un 403 limpia target y widget, explica permiso perdido y refresca Inicio; no crea un segundo sistema de permisos Home.

No agregar queries de autoría a la política `next`. Los destinos profundos existentes de Agenda/notificación conservan prioridad. Para evento privado desde Inicio: navegación a `/agenda?event=<uuid>&date=YYYY-MM-DD`, parser estricto propio de Agenda, recuperar evento por `get` autorizado y seleccionar ese día/detalle; sin ampliar `next` más allá de `/agenda`. Si la sesión vence se pierde ese contexto temporal y se explica, nunca se promete retorno profundo no soportado. No exponer títulos/propiedad en el query.

`/settings` requiere página/guard como perfil y reutiliza operaciones actuales de password/logout. La política de retorno agrega únicamente literal `/settings` con prueba de allowlist; no permite profile/queries arbitrarias. `/profile` conserva nombre/apellido y email readonly; no añade fotografía, cambio de email ni preferencias sin contrato.

## Estrategia de equipo y ownership

Contrato S0 integrado antes de backend/frontend. Se recomienda worktree separado para futuras líneas paralelas; el coordinador ya eligió branch dedicado y superficies disjuntas en checkout compartido, suficiente para esta ejecución. Ningún worker revierte trabajo ajeno ni edita tests. El coordinador posee roadmap, integración, exports compartidos y commits. `test_runner` posee exclusivamente archivos de prueba y evidencia; RED observado antes de comportamiento, workers GREEN después.

| Responsable | Escritura exclusiva y entrega |
|---|---|
| Worker 1 — datos/contratos | S0 core/export; `apps/api/src/home/**`, composición `apps/api/src/application.ts`, exports públicos API/Agenda/aulas requeridos, compatibilidad cover en policy; `apps/web/src/lib/{home-client,home-proxy}.ts`, ruta API Home; cambio allowlist settings en classroom-client. No UI TSX/CSS. |
| Worker 2 — fundaciones/shell/Home | Assets públicos `foxmind-3d/**`; `apps/shared-ui/**`; CSS de fundación del rediseño; `_app.tsx`; páginas acceso/perfil/settings/inicio; componentes account/Home shell y `Home.tsx` + nuevos widgets/hooks Home; `classrooms-screen.tsx` para inyectar HomeClient. No Classrooms.tsx ni ClassroomView. |
| Worker 3 — aulas/Agenda | `apps/classrooms-ui/**` salvo Home y widgets/hooks nuevos Home de Worker 2, incluyendo Classrooms.tsx/ClassroomView adaptadores tipados; `apps/agenda-ui/**`, `pages/agenda.tsx`, agenda-screen para private-event target; page files y componentes de archivos. CSS de aula/Agenda con namespace, no shared-ui/_app. No API/core ni clientes web. |

Coordinador resuelve una única vez imports/props entre 2 y 3 y declara archivos nuevos de cada worker antes de editar. CSS: entrypoint separado `foxmind-3d.css` de Worker 2 puede importar CSS de módulos de Worker 3; el dueño del entrypoint agrega esos imports al integrar. Si hay conflicto de ownership, detener solo ese archivo, no el resto. Cada agente mantiene registro propio. No micro-PR/push ahora: se usan unidades locales <=400 líneas con dependencias explícitas.

## Etapas, dependencias y primer slice

| Stage | Salida y dependencia | Evidencia para avanzar |
|---|---|---|
| D0/S0 | Baseline actual + contrato anterior; sin UI final dependiente de datos falsos | Inventario82 exacto, contratos/seguridad/fixtures sintéticos; fallos previos preservados y RED de cambios funcionales. |
| D1 | Tokens/controles/assets/motion sobre S0 | Hash/rutas/dimensiones/contraste/keyboard/reduced-motion; solo assets de producción publicados localmente. |
| D2 | Shell/sidebar/drawer/auth/account/settings sobre D1 | AUTH/NAV/ACC real; allowlist settings, guards, token/session y logout/pw. |
| D3 | Aulas/membresías/wizard/D3-COV sobre D2/S0 | CLASS01–14/PEOPLE, lectura10-escritura7/legacy y portada desconocida; persistencia confirmada. |
| D4 | Plan/Biblioteca/Muro/notificaciones sobre D3 | Plan default, dirigidos prevalecen; permisos/privados/CAS/historia. |
| D5 | Autoría/IA sobre D4 | Tres tipos, multi-tema, límites30, durable/manual/revisar/aplicar/publicar. |
| D6 | Entrega sobre D5 | Elegibilidad/override/reloj/editor/archivos/confirmación/historial reales. |
| D7 | Corrección/progreso sobre D6 | Privado/publicado/puntos racionales/rectificación/auditoría/métricas únicas. |
| D8 | Agenda sobre D2; rama paralela a D3–D7 dentro de ownership3 | Eventos/plazos/recurrencia/DST/color/CAS/día conservado. |
| D9 | Home backend puede avanzar tras S0; aceptación UI requiere D3–D8 | Ocho variantes, filas/counts exactos, paginado/partial/guards existentes/race/miniagenda real. |
| D10 | Integración de todos |82 IDs con prueba funcional/visual real, builds/types y revisión independiente sobre árbol final; rollback visual documentado. |

**Primer slice ejecutable: S0 + D9-A (proyección participación/pendientes).** `test_runner` crea `tests/home-contracts.test.mjs`, `home-pending.test.mjs`, `home-http.test.mjs` y fixture de integración propio en `_test`, observa RED por import/servicio inexistente y límites/privacidad; Worker1 implementa contrato/paginación/participation+pending reales. Los otros módulos se agregan en unidades D9-B (review/feedback), C (queries/material/classrooms), D (miniagenda/targets), cada una RED→GREEN antes de activar su widget. No publicar agregado final con mocks ni módulos que aparenten funcionalidad terminada. Worker2 puede desarrollar fundaciones decorativas a la vez; Worker3 espera RED de Plan default/COV.

### Interfaces públicas de presentación S0-UI

Conservar el contrato actual de AppNavbar (`logoHref`, `links:NavbarLink[]`, `displayName?`, `notifications?`, `accountActions?`, `onNavigate?`), `NavbarLink={href:string,label:string,current?:boolean}`; el dueño cambia su composición a sidebar/drawer, no obliga a los demás módulos a implementar sesión/routing otra vez. Clase/atributo de layout inequívoco para que el main deje espacio al lateral solo en privado; anónimo conserva layout de acceso. Logo privado apunta a Inicio. Foco al encabezado al completar navegación, drawer dialog con trap/Escape/retorno y sin dos overlays activos.

`FoxmindBrand({variant?:'horizontal'|'mark'|'inverse',className?:string,decorative?:boolean})` usa el logo original íntegro del manifest; `FoxmindIllustration({name:IllustrationKey,className?:string,priority?:boolean})` genera picture/img con srcset, medidas manifest y alt vacío; `IllustrationKey` admite exclusivamente los 16 nombres del catálogo. `FoxmindIcon({name:IconKey,className?:string})` usa sprite/vector local de 42 nombres y aria-hidden; el botón conserva nombre accesible. Barrel nuevo `apps/shared-ui/index.ts` exporta estos componentes y AppNavbar; no mueve imports históricos por estética. CSS importa tokens una vez en `_app.tsx`; preview standalone mantiene su entrada independiente.

`HomeClient={read(query:HomeQuery,signal?:AbortSignal):Promise<HomeResponse>,page(query:HomePageQuery,signal?:AbortSignal):Promise<HomeModuleResponse>}`; fábrica web `createWebHomeClient(fetcher?:typeof fetch,onIdentityRequired?:(code:string)=>void)` de Worker1. `Home` acepta nuevo `homeApi?:HomeClient` y `onOpenHomeTarget?:(target:HomeTarget)=>void` durante transición; la integración completa los vuelve obligatorios para Inicio final. No fabricar HomeResponse usando listas antiguas. Worker2 implementa sus widgets/hook; Worker3 pasa target hacia vista real y gestiona el adapter de cada tipo sin cruzar ownership.

La composición sidebar/drawer y los dos bloques simultáneos de mixed sustituyen para este alcance visual la topbar descrita en V1; Enseño/Estudio siguen siendo agrupaciones por membresía, nunca modos exclusivos ni roles de cuenta. Ninguna prueba antigua que imponga tabs vacíos ambos o una topbar impide el cambio autorizado: test_runner actualiza esas expectativas con RED del comportamiento nuevo y conserva las invariantes de seguridad.

## CRITERIOS_DE_TEST_DOT

`test_runner` es dueño de RED y de las pruebas. Para Home crear suites `home-{contracts,pending,review,feedback,miniagenda,http,proxy,client,integration}.test.mjs`; ampliar helpers existentes antes que duplicar infra. Estados UI y cambios de navegación requieren prueba de comportamiento; CSS puro exige revisión visual/estructural proporcional. El runner usa Node24, fixtures sintéticos propios y DB Docker `_test` con rollback o servicios desechables identificados. Nunca lee el helper P4-local retenido/configuración privada. No cambiar presupuestos para conseguir verde.

DoT Home mínimo: ocho escenarios (none, study, teach, mixed, aulas sin pendientes, solo archivadas, invitaciones/borradores sin membresía, error parcial); permiso revocado entre leer/abrir, cambio de cuenta y respuesta tardía; consultas acotadas independientemente del número de aulas; límite exacto5/6 y miniagenda3/4; cursores cross-user/módulo/zona inválidos; query extras y UUID desconocido; cuenta no verificada; transacción rollback/savepoint y timeout global; count exacto distinto de filas. Verificar fixtures reales de estudiante ajeno y docente en otra aula, sin notas/archivos/respuestas ajenas.

DoT colas: pending sin intento, DRAFT1, SUBMITTED, DRAFT2 autorizado, solo consulta, deadline null/general/individual mayor-menor, allowLate y antes/igual/después con reloj servidor; primera entrega histórica invariable. Review: sin grade, grade privado incompleto, listo con cero, cuestionario autocorregible no guardado, publicado, otro intento abierto, antiguo alumno; grupos/totales sin duplicación por temas. Feedback: efectivo publicado, privado excluido, intento nuevo aún sin publicar, rectificación de efectivo e histórica. Material borrado/vinculado/archivo inseguro excluido y sin seguimiento inventado. Queries hilo removido/respuesta editada/orden estable. Agenda privada de dueño, semanal53, DST, all-day, zona UTC+14/-12, futuros estrictos y ventana90; nunca fechas del mockup.

Miniagenda mantiene filas de fuente limitadas: consultar plazos SQL ordenados con LIMIT4 y hasta201 padres de eventos privados que solapen la ventana90. Si hay más de200 eventos padre, marcar el módulo no disponible y ofrecer Agenda; no devolver falsamente tres «primeros» de una muestra. Expandir como máximo53 ocurrencias por padre con el dominio existente, filtrar ahora y ordenar antes de tomar4. Ninguna consulta del navegador por cada padre. El límite es operativo reversible, sin ocultar eventos en Agenda ni cambiar su contrato.

### Evidencia requerida para los 82 IDs

Cada fila queda pendiente hasta adjuntar resultado actual en el registro del verificador. `C` = unitario/cliente/proxy del comportamiento; `I` = API→DB/archivo y persistencia reales sobre fixture propio cuando aplica; `V` = ego(lite) en Space dedicado, screenshot inspeccionado + teclado/DOM + ancho/estado/rol. Todas las filas requieren V; donde la fila dice conservar se reejecuta la regresión afectada, no se da por probada por su historia. Un recorrido puede producir evidencia para varias filas, vinculada por ID; ningún ID se acepta solo por una imagen estática del atlas. Las variantes/states completos de [coverage.json](../../docs/design/foxmind-3d/coverage.json) siguen siendo el checklist de estados.

| ID | Evidencia de aceptación específica, además de V |
|---|---|
| NAV-01 | C: selección correcta, drawer foco/Escape/retorno, Atrás y enlaces; sesión pendiente sin contenido privado. |
| AUTH-01 | C/I: login verificado→Inicio y next limitado; no verificado→gate; error/rate-limit/doble clic. |
| AUTH-02 | C/I: nombres80, password16–128, correo amplio/dominio minúsculo; respuesta genérica y sin rol global. |
| AUTH-03 | C/I: token propósito/uso/1h, cooldown60, recarga sin prueba; verificar no acepta invitación. |
| AUTH-04 | C/I: solicitud genérica exista/no, cooldown60 y error; sin revelar cuenta. |
| AUTH-05 | C/I: prueba15min/vencida/usada/otro propósito, password y cierre sesiones; no autologin. |
| ACC-01 | C/I: guardar/cancelar nombre/apellido, email readonly, shell actualizado y error sin perder edición. |
| ACC-02 | C/I: settings guard/next literal, password renueva actual/cierra otras, logout confirmado y fallo reintentable. |
| HOME-01 | C/I: ocho fixtures de participación y colas/miniagenda/atajo de aula real, sin selector de rol. |
| HOME-02 | C/I: partial/savepoint, vacío≠error, counts, foco60s, invalidación permiso/cuenta y respuesta tardía. |
| NAV-02 | C/I: campana/lectura idempotente y destino exacto, revocación segura, no lectura masiva implícita. |
| ACT-01 | C/I: lista real por rol/tipo/estado y actividad dirigida; estudiante sin borradores/respuestas privadas. |
| ACT-02 | C/I: borrador manual y currículo multitema en misma unidad; persistencia/revisión/dirty guard. |
| ACT-03 | C/I: TP instrucciones/adjuntos/materiales permitidos; archivo privado/listo y contexto preservado. |
| ACT-04 | C/I: tipos de pregunta/opciones/puntos/suma/orden y límites servidor; cero y selección múltiple. |
| ACT-05 | C/I: plazo/zona/allowLate y DST, política existente conservada; sin temporizador nuevo. |
| ACT-06 | C/I: revisar/publicar/retirar explícitos, ocupado/conflicto/resultado incierto sin duplicado. |
| ACT-07 | C/I: contenido bloqueado tras participar, organización permitida con revisión; sin perder historia. |
| AI-01 | C/I: solicitud explícita, fuentes20MB/contexto/manual, subtipo30/total30 y grounding legible. |
| AI-02 | C/I: QUEUED/RUNNING/READY/FAILED/STALE/APPLIED/UNKNOWN, recarga del mismo trabajo, sin retry ciego. |
| AI-03 | C/I: propuesta privada editada/preview estudiante sin claves; no cambia actividad actual al llegar. |
| AI-04 | C/I: aplicar revisión actual crea borrador, confirmación reemplazo y dirty guard; nunca publica. |
| AI-05 | C/I: regeneración explícita y unknown acknowledgment, falla conserva manual y propuesta anterior. |
| AGENDA-01 | C/I: mes/día/zona/navegación y range<=93, selección de fecha válida en móvil. |
| AGENDA-02 | C/I: eventos/plazos del día, hora/all-day/colores y fuente real diferenciados. |
| AGENDA-03 | C/I: deadline efectivo y target autorizado; no editar plazo desde evento personal. |
| AGENDA-04 | C/I: crear evento privado confirmado/propio, validación, idempotencia PUT y persistencia. |
| AGENDA-05 | C/I: NONE/WEEKLY, hasta53, until y resumen; no duplicar serie por recarga. |
| AGENDA-06 | C/I: inexistente/repetida exige elección de offset y conserva intención/horas. |
| AGENDA-07 | C/I: editar conserva día consultado/horario oculto all-day, color y selección. |
| AGENDA-08 | C/I: borrar evento/serie explícito, revisión y desaparición confirmada; cancela sin efectos. |
| AGENDA-09 | C/I: dos pestañas 409, comparar/recargar sin forzar ni perder dirty local. |
| AGENDA-10 | C/I: fallo/red/sesión y éxito confirmado; private-event target recupera detalle propio. |
| PLAN-01 | C/I: tema/unidad/contenido asociado; Plan default en ambas membresías y selector sheet móvil. |
| PLAN-02 | C/I: docente cambia estado de enseñanza con revisión; no altera entrega/nota del alumno. |
| PLAN-03 | C/I: añadir/renombrar/reordenar autorizado y persistente; límites/nombres/contexto. |
| PLAN-04 | C/I: eliminación permitida/conflicto con asociaciones; no borra historia académica. |
| PLAN-05 | C/I: versiones de plan privado/listo/PDF-DOCX, archivo anterior consultable y nueva versión confirmada. |
| LIB-01 | C/I: buscar/filtrar/listar/preview/download reales por permiso, vacío vs sin resultados. |
| LIB-02 | C/I: upload50MB/tipos/scan/cuota y publicación posterior, no éxito de material por seleccionar archivo. |
| LIB-03 | C/I: renombre/asociación con revisión conserva fileId y vínculos de actividad. |
| LIB-04 | C/I: eliminar no vinculado y conflicto vinculado, purga/estado actual sin falso archivo disponible. |
| LIB-05 | C/I: /files contextual preview/download protegido, ajeno/revocado/inseguro no expone contenido. |
| WALL-01 | C/I: avisos/consultas/respuestas por aula, texto eliminado seguro y estado vacío/error. |
| WALL-02 | C/I: aviso docente/consulta estudiante/respuesta permitida, idempotencia/revisión y notificación. |
| WALL-03 | C/I: edición propia/moderación docente con límites y archivo; no permisos por botones. |
| WALL-04 | C/I: post/reply de notificación exactos, foco/scroll seguro y revocación durante apertura. |
| PEOPLE-01 | C/I: compañeros solo nombres; docente lista actual; sin email/acciones/resumen ajeno estudiante. |
| PEOPLE-02 | C/I: resumen/historia docente y periodos separados de matrícula actual. |
| PEOPLE-03 | C/I: invitación/código/enviar/reenviar/revocar reales y disponibilidad por archivo. |
| PEOPLE-04 | C/I: salida/remoción revoca acceso y conserva intentos/notas; reingreso solo nueva invitación. |
| CLASS-01 | C/I: grilla3/2/1, search local, drafts/invites separados, archived visibles y diez coverKey lectura. |
| CLASS-02 | C/I: campos/límites/zonas/COV siete elecciones, legacy y guardado de borrador confirmado. |
| CLASS-03 | C/I: PDF/DOCX20MB, subida/aprobación/scan/ajeno/reemplazo, no continuar con pending. |
| CLASS-04 | C/I: extracción durable fixture controlado, edición/revisión/aplicar separados, manual concurrente intacto. |
| CLASS-05 | C/I: unidades/temas100/100/500, orden/nombres requeridos y autosave/volver; no publicar por Enter. |
| CLASS-06 | C/I: revisión/create bajo CAS e idempotencia; plan/unidades guardados; invitaciones posteriores. |
| CLASS-07 | C/I: código preview→confirm, inválido/regenerado/archivado/propio/existente sin matrícula implícita. |
| CLASS-08 | C/I: invitación correo exacto/7d/revocada/usada, registro/verificación nunca autoaceptan. |
| CLASS-09 | C/I: header compacto/rol/tabs, Plan default y destino explícito prevalece, archivo/revocado. |
| CLASS-10 | C/I: miembros actuales/historial y resumen por rol, foco regresa a fila. |
| CLASS-11 | C/I: correo amplio, envío/reenviar/revocar, estado de correo≠matrícula/entrega SMTP. |
| CLASS-12 | C/I: compartir/regenerar invalida código previo y conserva membresía/historia. |
| CLASS-13 | C/I: confirmar salida/remoción, no borrado histórico ni reingreso por código anterior. |
| CLASS-14 | C/I: settings aula/CAS y archivar/reactivar; read-only sin mutaciones ni alterar plazos. |
| CLASS-15 | C/I: tras crear/reabrir conserva Plan/versiones/unidades editadas y aula real. |
| SUB-01 | C/I: TP apertura actual y quiz/exam CTA explícito; preview docente nunca inicia. |
| SUB-02 | C/I: primera matrícula/reingreso/ausencia con is_expected, sin duplicar student_activity. |
| SUB-03 | C/I: autosave2s/cambio/flush/dirty/error/recuperación, sin autoenvío ni respuesta truncada. |
| SUB-04 | C/I: cinco adjuntos50MB/tipos/seguridad/cuota, selección/upload/aprobación/envío separados. |
| SUB-05 | C/I: segunda pestaña consulta, transferencia explícita invalida editor viejo y preserva guardado. |
| SUB-06 | C/I: confirmIncomplete/comprobante persistente/doble click/response loss y reloj límite real. |
| SUB-07 | C/I: historial/reapertura explícita conserva nota/primer envío, deadline individual y nuevo DRAFT. |
| SUB-08 | C/I: autorización individual futura cambia solo obligación propia, no inventa entrega/intento extra. |
| GRADE-01 | C/I: guardar privado TP0–10/desarrollo/racionales/feedback5000 y pending null≠0. |
| GRADE-02 | C/I: publicación completa y atómica/nota+notificación; todas manuales guardadas y cero válido. |
| GRADE-03 | C/I: motivo/audit solo docente, rectificación histórica no se vuelve efectiva. |
| GRADE-04 | C/I: resultado propio publicado por intento/pregunta, sin claves no elegidas ni audit privado. |
| GRADE-05 | C/I: notificación correcta actividad/intento/grade en cuenta mixta y acceso revocado. |
| PROG-01 | C/I: cumplimiento/desempeño/avance separados; pendiente no es cero, primera recepción fija plazo. |
| PROG-02 | C/I: promedio actual de medias, multitema/intentos únicos, cero/sin notas y elegibilidad distinta. |
| PROG-03 | C/I: historial excluido del actual, reingreso sin duplicar y acceso individual docente correcto. |

### Cierre D10 y handoff

1. `test_runner` captura en ego(lite) Space dedicado las superficies reales a320/390/768/1024/1440, zoom200%, teclado/foco, textos largos, imágenes fallidas y reduced-motion. Registra URL sin secreto, fixture/rol/estado, ID de cobertura, PNG y resultado de inspección. Captura de mockup o solo geometría no se llama aceptación de píxeles.
2. Reejecutar suites existentes afectadas: identidad/P3, P5–P8, p9-home/login-inicio, Agenda y activity/classroom-AI con proveedor controlado; comandos exactos elegidos por runner según archivos modificados. Builds `npm run api:build`, `npm run web:build`, tipos estrictos web/API; preservar30s/180s y límites de fixtures existentes. Un test browser condicionado omitido no es evidencia live.
3. Reviewer independiente inspecciona diff final, permiso/contrato/archivos/secret-free/assets/performance; aplicar juicio L3 según coordinador. Medir LCP/CLS/INP y peticiones/peso de cada pantalla con runtime real, comparar baseline observado y documentar deltas, sin inventar presupuesto o métrica aprobada. Assets mantienen variantes/peso/dimensiones; no descargar catálogo entero.
4. Reconciliar82 filas con evidencia y fallos/skips; actualizar estados solo con prueba aplicable. Coordinador actualiza roadmap/registros/commits locales y conserva historia. Rollback visual usa antiguo entrypoint/estilos conservados, mantiene contratos/datos y acceso settings compatible; no rollback por borrar tablas, entregas, versiones ni aulas.

Registro de diseño: [visual-architecture](../../docs/work-log/2026-10-25-visual-architecture.md). Primera acción del coordinador: entregar S0/D9-A al runner RED y ownership1 al implementador; liberar D1 decorativo en paralelo y Plan-default/COV solo después de su RED. El documento no afirma producto implementado ni resultados de pruebas ajenas como propios.
