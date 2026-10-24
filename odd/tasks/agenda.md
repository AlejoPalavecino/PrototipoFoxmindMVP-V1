# Agenda global y eventos privados

ESTADO_DISENO: LISTO_PARA_TDD_RED

El alcance solicitado añade `Agenda` junto a `Inicio` y `Mis aulas`, próximas entregas obtenidas de datos reales y eventos personales para clases, actividades y evaluaciones. La implementación está autorizada en el worktree `codex/foxmind-agenda`. El usuario confirmó por medio del coordinador eventos únicos y repetición semanal desde la primera versión. Este documento fija el contrato previo a RED; no registra implementación ni pruebas funcionales ejecutadas.

## D1 — recurrencia resuelta

| Opción | Comportamiento | Fiabilidad / coste |
|---|---|---|
| A: semanal | Evento único o serie semanal hasta una fecha final. Editar/eliminar afecta toda la serie y la UI lo anuncia. Sin excepciones por ocurrencia. | Útil para clases; exige expandir por fecha local y probar cambios estacionales de zona. Mayor superficie que CRUD simple. |
| B: únicos | Cada evento tiene una fecha; crear, editar y eliminar individualmente. | Menor superficie y contrato temporal más simple; las clases semanales se cargan por separado. |

Decisión humana recibida por el coordinador: **A, eventos únicos y repetición semanal desde la primera versión**. El coordinador confirma series acotadas con edición/borrado de serie entera claramente anunciados y sin excepciones por ocurrencia. B se conserva solo como historial de la alternativa descartada. No hay otra duda imprescindible para iniciar RED.

## Evidencia y arquitectura

- Base observada: `ed06f88`, main P0–P9 más presentación Carpetas. [Roadmap](../../docs/implementation-roadmap.md) y [registro de diseño](../../docs/work-log/2026-10-23-design_agenda.md).
- [Especificación](../../docs/foxmind-v1-functional-spec.md), secciones 4, 7 y 11: roles por aula, navegación superior, plazo UTC mostrado en zona del aula, elegibilidad y plazos individuales. Agenda amplía la navegación confirmada; no cambia reglas académicas.
- Stack actual: Next.js Pages/React, TypeScript estricto, NestJS, PostgreSQL/Prisma. Se conserva para mantener contratos y sesión existentes. No se añade proveedor, servicio externo ni biblioteca de calendario.
- `prisma/schema.prisma` ya tiene `Activity`, `StudentActivity`, `Attempt` y `MembershipPeriod`; no tiene eventos personales. `src/core/domain/` aún no existe. Crear allí el contrato compartido puro como primera unidad; API y web lo importan por su `index.ts`.
- Aulas no dispone de `index.ts`: añadir una fachada pública pequeña para el puerto académico. El adaptador permanece dentro de aulas y reutiliza sus políticas; Agenda no importa sus archivos internos ni consulta por su cuenta obligaciones/intentos.
- Inicio y la navegación de aulas viven en `apps/classrooms-ui/`; páginas/cuenta en `apps/web/`. Hay dos usos de `AppNavbar` que deben ofrecer Agenda: aulas y `AccountNavbar`. `classroomDestination` solo admite Inicio/Mis aulas y una invitación: ampliar mediante destinos literales y UUID validados, nunca URLs arbitrarias.

## Supuestos asumidos y alcance

Son convenciones explícitas de esta entrega; solo D1 se atribuye a la respuesta humana. Las demás son decisiones reversibles del diseño dentro del alcance autorizado.

- Cualquier cuenta verificada dispone de agenda propia, aunque no integre aulas. No existe rol global docente/estudiante.
- Vista inicial de mes con lista accesible del día seleccionado; en móvil prima la lista. Panel `Próximas entregas` separado de `Mis eventos`. Mantener tokens y estilo Carpetas.
- Eventos privados de categorías `CLASS`, `ACTIVITY`, `EVALUATION`; título obligatorio, descripción opcional, fecha/hora o día completo. Crear un evento nunca crea/publica una actividad ni una notificación académica. Este corte no añade enlaces de eventos personales a aulas.
- En la agenda del estudiante, próximas entregas significa obligaciones publicadas esperadas, con plazo futuro y pendiente del primer envío o una reentrega actualmente habilitada. Una primera entrega ya confirmada no vuelve a aparecer salvo nuevo intento pendiente.
- En aulas donde enseña, mostrar plazos generales publicados con etiqueta `Enseño`, sin datos ni plazos individuales de alumnos. En aulas donde estudia, mostrar su plazo efectivo con etiqueta `Estudio`. No agregar rol ni selector global.
- Excluir de próximas entregas aulas archivadas, acceso revocado, borradores, actividades retiradas, trabajo no esperado, sin plazo y plazos vencidos. El calendario del rango puede mostrar plazos ya pasados/completados, con su estado; no inventa vencimiento para trabajo sin fecha.
- Los eventos personales no dependen de una membresía de aula. Las tarjetas de entrega académica sí comprueban acceso actual al abrir la actividad.
- No recordatorios por email, sincronización externa, arrastrar/soltar, invitados ni calendario compartido en este corte. La rama A incluye solo repetición semanal; otras frecuencias/excepciones quedan posteriores.

## Compuerta DoR en seis dimensiones

| Dimensión | Contrato propuesto |
|---|---|
| Datos / idempotencia | Esquemas estrictos sin claves extra; IDs UUID. Alta con ID generado por cliente y `PUT`: reintento idéntico devuelve el mismo evento, carga distinta para el mismo ID da conflicto. Doble clic no crea duplicados. |
| Estados | Evento privado activo → editado con revisión creciente → eliminado físicamente por su dueño. Plazos académicos son proyecciones de solo lectura; ningún CRUD de Agenda los cambia. |
| Fallos / atomicidad | Escritura privada en una transacción. Un fallo conserva el formulario. Si se confirma escritura y falla refresco, informar que se guardó y ofrecer reintentar lectura, sin duplicar. No mostrar fallo de consulta como agenda vacía. |
| Concurrencia | Revisión decimal en actualizar/eliminar; compare-and-swap condicionado por dueño y revisión. Conflicto devuelve 409 y pide recargar conservando cambios. Sesión/permisos revalidados tras esperas conforme al patrón existente. |
| Permisos | Dueño derivado solo de sesión persistida; nunca aceptarlo del cuerpo/query. Un UUID ajeno y uno inexistente producen la misma denegación sin datos. Escrituras requieren sesión verificada, Origin y CSRF. |
| GRASP | Dominio puro, repositorio privado y puerto académico separados. Experto académico en aulas; experta en eventos personales Agenda. Fachadas públicas, sin nuevo árbol de herencia ni acceso cruzado a detalles. |

## Contrato compartido primero

Tipos exactos para `src/core/domain/agenda.ts`; validadores puros en archivo separado, sin Nest/React/Prisma. `Id`, `Instant`, `LocalDate`, `LocalMinute`, `Revision` son aliases exportados de `string`, validados como UUID, ISO UTC, `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm` y decimal no negativo, respectivamente.

```ts
type EventKind = 'CLASS' | 'ACTIVITY' | 'EVALUATION';
type AgendaTarget = { classroomId: Id; activityId: Id | null };
type EventSchedule =
  | { kind: 'TIMED'; timeZone: string; startLocal: LocalMinute;
      endLocal: LocalMinute; startOffsetMinutes?: number;
      endOffsetMinutes?: number }
  | { kind: 'ALL_DAY'; startDate: LocalDate; endDateExclusive: LocalDate };
type EventRepeat = { kind: 'NONE' }
  | { kind: 'WEEKLY'; untilDate: LocalDate };
interface EventPayload {
  title: string; description: string; category: EventKind;
  schedule: EventSchedule; repeat: EventRepeat;
}
interface PrivateEvent extends EventPayload {
  id: Id; revision: Revision; createdAt: Instant; updatedAt: Instant;
}
interface EventOccurrence {
  kind: 'PRIVATE_EVENT'; occurrenceId: string; event: PrivateEvent;
  startDate: LocalDate; endDateExclusive: LocalDate;
  startAt: Instant | null; endAt: Instant | null;
}
interface AcademicDeadline {
  kind: 'ACADEMIC_DEADLINE'; id: string; target: AgendaTarget;
  classroomName: string; title: string;
  activityType: 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
  role: 'teacher' | 'student'; deadlineAt: Instant; timeZone: string;
  pending: boolean; resubmission: boolean;
}
interface AgendaRange {
  startDate: LocalDate; endDateExclusive: LocalDate; timeZone: string;
}
interface AgendaPage {
  serverTime: Instant; items: (EventOccurrence | AcademicDeadline)[];
  nextCursor: string | null;
}
```

`EventRepeat` admite ambas variantes confirmadas. Los tipos del ejemplo se exportan públicamente con prefijo Agenda cuando evite colisiones.

Exports de validación: `parseAgendaEvent(input: unknown): EventPayload`, `parseAgendaRange(input: unknown): AgendaRange`, `validateAgendaSeries(payload: EventPayload): void`, `expandAgendaEvent(event: PrivateEvent, range: AgendaRange): EventOccurrence[]`. Exportar `AgendaError` con constructor `(code: 'INVALID_INPUT' | 'CONFLICT' | 'FORBIDDEN' | 'SERVICE_UNAVAILABLE')` y propiedad `code`; el transporte mapea errores de identidad por separado. `parseAgendaEvent` valida también la serie completa; cualquier variante temporal inválida falla antes de persistir. No incluir `target` en el payload privado: es clave extra y se rechaza.

Validación común: título recortado 1–160 caracteres; descripción hasta 4000; texto plano; fecha real y fin posterior a inicio; zona IANA válida. TIMED tiene precisión de minuto. ALL_DAY usa fechas, fin exclusivo y nunca se convierte a medianoche UTC. Campos de otra variante o adicionales se rechazan. HTTP incluye como máximo 32 KiB de JSON, siguiendo cualquier límite compartido más estricto.

TIMED conserva zona y fechas locales, y resuelve instantes UTC en servidor. Los offsets son minutos al este de UTC (`local = UTC + offsetMinutes`). Inicio/fin en hueco estacional se rechazan; hora ambigua requiere offset explícito de las opciones válidas. No interpretar silenciosamente con la zona del navegador. El navegador solo sugiere una zona seleccionable para eventos personales. Plazos académicos siempre muestran zona del aula explícita, incluso cuando la cuadrícula se agrupa por la zona elegida para la vista.

Serie semanal acotada: mismo día/hora locales, fecha final inclusiva, máximo 53 ocurrencias por serie en esta versión para acotar validación y UX. Verificar todas al guardar; si otra ocurrencia cae en hora inexistente/ambigua, rechazar la serie con las fechas problemáticas y pedir otro horario. No desplazarla ni omitirla en silencio. Editar/eliminar es sobre la serie completa, incluidos eventos pasados, con aviso previo. El tope y rechazo estricto de transiciones conflictivas son supuestos técnicos conservadores y revisables de esta entrega; no se atribuyen como reglas históricas del producto.

Puertos exactos en `agenda-ports.ts`:

```ts
interface AgendaActor { userId: Id; now: Instant }
interface PrivateEventRepository { // ya ligado al dueño autenticado
  list(range: AgendaRange, cursor: string | null): Promise<PrivateEvent[]>;
  get(id: Id): Promise<PrivateEvent | null>;
  create(id: Id, payload: EventPayload): Promise<PrivateEvent>;
  replace(id: Id, revision: Revision, payload: EventPayload): Promise<PrivateEvent>;
  remove(id: Id, revision: Revision): Promise<void>;
}
interface AcademicAgendaPort {
  list(range: AgendaRange): Promise<AcademicDeadline[]>;
  upcoming(limit: number): Promise<AcademicDeadline[]>;
  resolveTarget(target: AgendaTarget): Promise<AgendaTarget | null>;
}
interface AgendaUnit {
  actor: AgendaActor; events: PrivateEventRepository;
  academic: AcademicAgendaPort;
}
interface AgendaUnitOfWork {
  run<T>(request: unknown, write: boolean,
    operation: (unit: AgendaUnit) => Promise<T>): Promise<T>;
}
```

`request` es opaco para el dominio; el adaptador HTTP/identidad autentica y entrega puertos ligados al mismo actor y transacción. No introducir SQL, cookies ni tokens en tipos de evento. Todos los accesos de repositorio filtran `owner_id`, no solo el método GET. El puerto académico se implementa dentro de aulas, reutilizando política de plazo efectivo y elegibilidad; no hace N llamadas HTTP por aula.

Fachada ejecutable exportada en `apps/api/src/agenda/index.ts`: `createAgendaService(uow: AgendaUnitOfWork): AgendaService`. Firmas públicas exactas:

```ts
interface AgendaService {
  put(request: unknown, id: string, input: unknown):
    Promise<{ event: PrivateEvent; created: boolean }>;
  get(request: unknown, id: string): Promise<PrivateEvent>;
  replace(request: unknown, id: string, input: unknown): Promise<PrivateEvent>;
  remove(request: unknown, id: string, input: unknown): Promise<void>;
  list(request: unknown, input: unknown, cursor?: string | null): Promise<AgendaPage>;
  upcoming(request: unknown, limit?: number):
    Promise<{ serverTime: Instant; items: AcademicDeadline[] }>;
  open(request: unknown, input: unknown): Promise<AgendaTarget>;
}
```

`replace` recibe exactamente `{revision, event: EventPayload}`, `remove` exactamente `{revision}`, `open` exactamente `AgendaTarget`; `put` recibe el payload directo. `list` usa cursor nulo por defecto, `upcoming` límite 5. La fachada valida IDs y entradas antes de invocar repositorios; no acepta actor por argumento público. `created` se usa exclusivamente para el estado HTTP del PUT y no requiere envolver las demás respuestas. `occurrenceId` es `${event.id}:${fecha-local-inicial-de-la-ocurrencia}`; expandir solo ocurrencias que se solapen con `[startDate,endDateExclusive)` en la zona de vista, conservando ALL_DAY por fecha. Ordenar de forma estable por instante/fecha y ese ID. Ningún método inicia o confirma intentos.

## HTTP, persistencia y apertura de actividad

| Método / ruta bajo `/api/v1` | Entrada → salida |
|---|---|
| GET `/agenda` | `startDate`, `endDateExclusive`, `timeZone`, `cursor?` → `AgendaPage`. Rango máximo 93 días; página máxima 200 elementos, orden determinista por posición temporal/tipo/ID. Cursor opaco ligado al rango y dueño; sin truncado silencioso. |
| GET `/agenda/upcoming` | `limit?` entero 1–20, defecto 5 → `{serverTime, items: AcademicDeadline[]}`. Solo pendientes futuros, orden plazo/ID; no limita a las primeras aulas. |
| PUT `/agenda/events/:id` | `EventPayload` → `PrivateEvent`; crear idempotente, 201 nuevo/200 repetición idéntica. |
| GET `/agenda/events/:id` | → `PrivateEvent` del dueño. |
| PATCH `/agenda/events/:id` | `{revision, event: EventPayload}` → `PrivateEvent` con revisión incrementada. |
| DELETE `/agenda/events/:id` | `{revision}` → 204. No repetir automáticamente tras resultado incierto: consultar primero. |
| POST `/agenda/open` | `AgendaTarget` → destino estructurado vigente; no URL externa. Revalida acceso y existencia de actividad. |

Errores públicos: `INVALID_INPUT` 400, autenticación/verificación/CSRF según identidad existente, `FORBIDDEN` 403 para destino/evento ajeno o inexistente, `CONFLICT` 409 para revisión/carga idempotente incompatible, `SERVICE_UNAVAILABLE` 503 sanitizado. Errores temporales incluyen código/fechas/opciones válidas sin datos privados ajenos. Respuestas `no-store`; sin caché compartida.

Nueva tabla `agenda_events`: `id UUID PK`, `owner_id UUID FK users RESTRICT`, título, descripción, categoría, variante de horario, fechas locales, zona/offsets e instantes UTC para TIMED, repetición semanal opcional, `revision BIGINT`, `created_at/updated_at TIMESTAMPTZ`. ALL_DAY mantiene campos UTC/zona nulos. CHECKs verifican variantes/exclusión y fin; índice por dueño/fecha. No FK de evento a aula/actividad; el borrado privado no toca contenido académico. No backfill ni edición de registros retenidos.

El calendario deriva entregas en lectura, nunca las duplica en `agenda_events`. Para estudiantes: usar `is_expected`, membresía vigente, actividad publicada, último intento y máximo de plazo general/individual aplicable. Con último intento SUBMITTED no hay pendiente; con DRAFT reabierto sí. Sin intento, usar el plazo individual de primera entrega si existe. No consultar ni enviar respuestas, notas o alumnos ajenos. La proyección no cambia el progreso P8 ni la clasificación histórica del primer envío.

Destino web propuesto: `/mis-aulas?aula=<UUID>&actividad=<UUID>`; aula sola sin actividad. `classroomDestination` acepta únicamente esas combinaciones exactas, además de las actuales y `/agenda`. `ClassroomsScreen`/`ClassroomsApp` reciben un destino tipado, comprueban servidor y abren la pestaña Actividades existente; la tarjeta no inicia intento automáticamente. Permiso perdido muestra una denegación recuperable sin conservar contenido autorizado anteriormente en pantalla. Regreso a Agenda conserva rango, no datos privados en URL.

## Estrategia de equipo y plan por slice

Worktree separado ya creado por coordinador; checkout histórico no se toca. Coordinador hizo `git fetch origin` exit 0; `origin/main` sigue `ed06f885bfbf08725024013a7a45c9a3a723cfc7` antes de planear la migración. Reconciliar de nuevo al generarla. Un único dueño de schema/migración, composición de API y ambos puntos de navbar. Test runner posee tests; worker tiene prohibido editarlos. Cada archivo nuevo <200 líneas y función <40; partir unidades/commits revisables de ≤400 líneas. Un slice puede necesitar varios commits, no fingir que toda Agenda cabe en 400 líneas.

| Orden / slice | Archivos a crear o editar | Resultado / propietario |
|---|---|---|
| A0 contrato | crear `src/core/domain/{agenda.ts,agenda-validation.ts,agenda-ports.ts,index.ts}` | Contrato puro acordado primero; microcommit común antes de backend/frontend. |
| A1 eventos / esquema | editar `prisma/schema.prisma`; crear una migración `*_agenda_events/migration.sql`; crear `apps/api/src/agenda/{event-policy.ts,event-repository.ts,event-service.ts}` | CRUD privado, CAS e idempotencia; worker DB único. |
| A2 lectura académica | crear `apps/api/src/classrooms/{agenda-query.ts,index.ts}` | Puerto público de proyección; conserva reglas P7/P8 y no añade herencia. |
| A3 transporte | crear `apps/api/src/agenda/{agenda-service.ts,http.ts,host.ts,agenda.module.ts,index.ts}`; editar `apps/api/src/application.ts` | Sesión/CSRF real, composición y rutas. Separar wiring de operaciones para mantener límites. |
| A4 cliente / proxy | crear `apps/agenda-ui/{api.ts,index.ts}`; crear `apps/web/src/lib/{agenda-client.ts,agenda-proxy.ts}` y `apps/web/pages/api/v1/agenda/[[...path]].ts` | Esquema compartido en ambos extremos; allowlist exacta sin proxy abierto. |
| A5 UI | crear `apps/agenda-ui/{Agenda.tsx,EventForm.tsx,AgendaMonth.tsx,Upcoming.tsx,agenda-repeat.ts,agenda.css}` y `apps/web/{pages/agenda.tsx,src/components/agenda-screen.tsx}` | Mes/lista, formulario accesible, estados, repetición semanal y panel real. |
| A6 navegación / entrega | editar `apps/classrooms-ui/{Classrooms.tsx,Home.tsx}`, `apps/web/src/components/{account-navbar.tsx,classrooms-screen.tsx}`, `apps/web/src/lib/classroom-client.ts`, `apps/web/pages/_app.tsx`; si necesita prop, `apps/classrooms-ui/Activities.tsx` | Agenda global en ambas barras, retorno de auth y apertura segura. No refactor general de archivos históricos. |
| A7 evidencia | test runner crea los grupos descritos abajo; coordinador actualiza este task, su work log y roadmap | Verificación independiente, revisión, commits locales y posterior integración según autoridad humana vigente. Publicar/desplegar requiere alcance correspondiente. |

## Criterios de test DoT

Test runner escribe primero RED observado; no cuentan tests que solo busquen cadenas de implementación. Nuevos archivos `tests/agenda-{contracts,event-policy,time,events,http,proxy,client,academic}-*.test.mjs` pueden dividirse para respetar límites. Reutilizar runtimes públicos de integración ya existentes, sin leer configuración privada retenida.

| Grupo | Prueba observable obligatoria |
|---|---|
| Unitario dominio | Variantes estrictas; fechas imposibles, fin exclusivo ALL_DAY, límites/HTML como texto; zona inválida; hueco y doble hora; rechazo de claves owner/role; IDs/cursor inválidos. Semana local a través de DST, fecha fin inclusiva, tope y conflictos futuros; NONE no expande una serie. |
| Unitario aplicación | Repo en memoria: repetir PUT idéntico no duplica; PUT incompatible y PATCH obsoleto dan conflicto; error de escritura no borra formulario; lectura fallida no se representa vacía; respuesta fuera de orden/abortada no sobreescribe otra vista. |
| Integración Docker `_test` | Migración desde base actual, CHECK/FK, dueño, todos los CRUD, rollback y persistencia tras nueva instancia. Dos PATCH con misma revisión: exactamente uno confirma. Sesión revocada/caducada/no verificada, Origin/CSRF inválidos y UUID ajeno no revelan/modifican datos. Usar usuarios/filas desechables; rollback o limpieza solo propia. |
| Entregas reales | Dos aulas y roles simultáneos; expected frente no esperado; borrador/retirada/archivo/expulsión; sin plazo; primer envío; DRAFT abierto y reentrega; plazo individual mayor/menor que general, extensión general, primera entrega autorizada; igualdad `deadline==serverTime` no es próxima. Profesor no recibe información individual. Fechas y zona coinciden con sesión académica existente. |
| HTTP/proxy/cliente | Todas las rutas contra sesión y DB reales; métodos no permitidos, JSON/bytes/cursor/rangos inválidos, IDOR; `no-store`; PUT/PATCH/DELETE con CSRF; `/agenda` como destino de auth; deep link exacto válido/rechazado y acceso perdido después de listar. |
| UI ego(lite) | Space dedicado con snapshots y capture desktop/móvil: Agenda junto a Inicio/Mis aulas desde ambas barras, seleccionar día, CRUD horario/día completo, cancelar, conflicto entre pestañas, estado vacío/error/reintento sin duplicados, categoría/texto largos, keyboard/focus/escape/etiquetas, sin desborde. A: crear/editar/eliminar serie con aviso visible. |
| Flujo completo independiente | Usuario A crea evento, recarga y verifica persistencia; usuario B no lo ve ni abre por UUID. Publicar actividad con plazo real; estudiante ve entrega, abre actividad correcta sin iniciar intento, confirma entrega y desaparece de próximas; docente reabre con plazo individual y reaparece. Captura+API+SQL con datos desechables. |

Comandos mínimos después de GREEN: `npm run api:build`, `npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build`, grupos de tests Agenda y regresión focal de navegación/auth, participación/plazos y folder. Mantener límites vigentes; no ampliar timeouts por cuenta propia. Native review según política efectiva, sin atribuir aprobaciones inexistentes. Esta etapa documental no ejecuta ni aprueba esos checks.

## Estado y próximo paso

- [x] Diseño y revisión de DoR contra código/docs reales.
- [x] D1 respondida por el usuario: únicos y semanales.
- [x] RED independiente, implementación, persistencia, navegación y recorridos funcionales reales.
- [x] Revisiones y correcciones J1–J4; verificación final J4 y builds. El juicio dual histórico terminó ESCALATED; J4 se cerró por seguimiento expresamente autorizado.
- [x] Commits locales por unidades revisables en codex/foxmind-agenda.
- [ ] Aceptación visual por capturas: ego(lite) devolvió timeout y produjo0imágenes aun con intervención humana. DOM móvil y recorrido funcional sí tienen evidencia.
- [ ] Integración a main/publicación: fuera del alcance de esta entrega, pendiente de instrucción futura.

[Cierre del coordinador](../../docs/work-log/2026-10-24-root-agenda-closure.md), [verificación final](../../docs/work-log/2026-10-24-agenda-final-verify.md) y [revisión puntual](../../docs/work-log/2026-10-24-agenda-final-review.md) conservan resultados y límites. Próximo paso exacto: revisar los commits locales para una integración futura; no repetir D1 ni presentar capturas inexistentes como aprobación.
