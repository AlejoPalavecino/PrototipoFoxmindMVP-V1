# Formulario compacto de eventos — contrato previo a RED

ESTADO_DISENO: LISTO_PARA_TDD_RED

Primera entrega autorizada: simplificar el formulario personal de Agenda manteniendo la presentación Folder, los contratos de [Agenda](agenda.md) y la [propuesta UX](../../docs/agenda-event-ux-proposal.md). Cambios de interfaz y estado local en `codex/foxmind-agenda`; sin DB, API, dependencias ni nueva frecuencia de repetición. No registra implementación, aceptación visual ni pruebas ya ejecutadas. [Registro atribuible](../../docs/work-log/2026-10-24-event-form-design.md).

## SUPUESTOS_ASUMIDOS

- Conservar stack y componentes del producto existente. No es Greenfield; no hay decisión de stack ni negocio pendiente. El coordinador transmitió autorización para implementar en el worktree actual.
- Alta: fecha seleccionada, 09:00, duración 60 minutos, categoría Clase y repetición desactivada. Al activar semanal por primera vez, sugerir hasta inicio +28 días, visible y editable: 5 ocurrencias inclusive, sin inferir semestre.
- Edición: cargar exactamente fechas, horas, zona, repetición y offsets existentes. El fin empieza en modo manual, incluso cuando coincide con un atajo. No transformar una edición en un nuevo evento.
- Alta usa zona del calendario; edición TIMED conserva la zona guardada. ALL_DAY conserva fechas y usa la zona del calendario solo como sugerencia si vuelve a horario. La zona de un evento nunca cambia la del calendario.
- Cambiar zona conserva la fecha/hora local y limpia selecciones DST previas. Ayuda explícita: “Al cambiar la zona se mantiene la hora que escribiste; cambia el momento real del evento”. No convertir el horario sin intervención.
- Al crear, seleccionar el primer día del evento en la zona de vista. Al editar, conservar selección actual; ofrecer “Ver evento” o, para una serie, “Ver inicio de la serie”. No buscar semestre ni próxima ocurrencia.
- Cerrar un borrador sin cambios es inmediato. Un borrador modificado requiere confirmar descarte y permite continuar editando. Busy impide cierre/escritura concurrente.
- No Engram: las escrituras están prohibidas mientras este host carezca de registro. Este contrato versionable conserva el handoff. El coordinador es único dueño del roadmap.

## DoR en seis dimensiones

| Dimensión | Decisión aplicable |
|---|---|
| Datos / idempotencia | IDs de alta estables durante la vida del editor; mismo PUT en reintento. Payload estricto existente; máximo 160/4000 caracteres, fechas reales y hasta 53 ocurrencias. Una respuesta de escritura confirmada se comunica una sola vez. |
| Estados | Nuevo/editando → validando → guardando → guardado; error mantiene campos; conflicto mantiene campos y bloquea nueva escritura hasta revisar. Descartar no escribe. ALL_DAY mantiene horas locales en borrador para recuperarlas. |
| Fallos | Validación inline y foco al primer campo. Errores de sesión/servicio permanecen legibles. Refresco fallido después de guardar ofrece reconsulta sin repetir PUT/PATCH. No presentar un error como vista vacía. |
| Concurrencia | Conservar CAS, aviso de toda la serie incluidas fechas pasadas, revisión antes de borrar y revisión guardada sin reemplazar el borrador. Mantener protecciones J3/J4 ante lectura fuera de orden y permiso revocado. |
| Permisos | Sin cambios: dueño de sesión, correo verificado, Origin/CSRF, privacidad y entregas académicas de solo lectura. El formulario no añade campos de dueño/aula/rol. |
| GRASP | Reutilizar dominio desde su barril. Helpers puros de borrador separados de editor asíncrono y render. Sin segundo resolvedor DST ni nueva abstracción de infraestructura. Código <200 líneas/archivo, funciones <40; unidades revisables <=400 líneas. |

## Interfaz y comportamiento observable

| Grupo | Campos y reglas |
|---|---|
| Qué | Opciones accesibles Clase / Evaluación / Actividad, título con ejemplo contextual y ayuda de privacidad. Categoría seleccionada identificable sin depender del color. |
| Cuándo | Fecha e inicio separados; duración 30 / 60 / 90 minutos y acción “Ajustar fin”. Un atajo calcula fin por aritmética de calendario local. “Ajustar fin” permite hora final y marca modo manual. Fecha de fin adicional en “Ocupa varios días”, visible automáticamente al editar un multiday. |
| Día completo | Toggle conserva ambas horas, fechas y selección de fin. Payload ALL_DAY omite hora/zona/offsets y convierte último día incluido a fin exclusivo. Al desactivar, reaparecen las horas previas; si el resultado es inválido, se señala sin moverlo en silencio. |
| Repetición | “Una vez” / “Cada semana” explícitos. Semanal muestra fecha final inclusiva, día real, cantidad y límite 53. Contar desde primera fecha cada 7 días hasta inclusive; no truncar 54 a 53. |
| Opciones | Notas opcionales, hasta 4000 caracteres; fecha de fin multiday y cambio de zona como secundarios. Un valor ya cargado debe ser accesible/visible sin perderse al plegar. No recordatorios, aula, ubicación ni invitados. |
| Zona | Solo TIMED: etiqueta discreta “Hora de Buenos Aires” (o ciudad efectiva) cerca del horario. ALL_DAY oculta referencia y cambio de zona porque no aplican. “Cambiar” abre opciones con ciudad/país legibles y ayuda sobre hora local. Selector cerrado con ciudades vigentes más la zona actual heredada. IANA solo como valor interno; sin campo libre IANA ni inputs numéricos de offsets. UTC se llama “Hora universal”. |
| Resumen | Título, fecha legible, intervalo o día completo; semanal agrega día, última fecha efectiva y número de eventos. Derivar del mismo borrador; entradas incompletas no deben hacer fallar el render ni prometer que se puede guardar. |
| Acciones | Alta “Crear evento”; edición “Guardar cambios”. Error junto al campo con aria-invalid/aria-describedby; abrir secundario si contiene primer error y enfocar control. Éxito visible y acción para encontrar evento. Mantener teclado/Escape y foco del Dialog existente. |

Cambiar inicio en modo DURATION recalcula fin con duración elegida, incluso cruzando medianoche. En MANUAL conserva fin exacto; si queda antes del inicio, informa error. Cambiar fecha/hora de un extremo invalida solo su offset; si el fin automático se mueve, invalida también su offset. Cambiar zona invalida ambos. Toggle ALL_DAY por sí solo no borra horas ni offsets: el serializador ignora los que no pertenecen a esa variante.

## Contrato público del borrador

Tipos locales en `apps/agenda-ui/event-draft-types.ts`, importando `EventKind`, `EventPayload` y `PrivateEvent` del barril `src/core/domain/index.ts`. No cambiar tipos de dominio/API.

```ts
export interface EventDraft {
  title: string; description: string; category: EventKind;
  allDay: boolean; startDate: string; endDate: string;
  startTime: string; endTime: string; zone: string;
  weekly: boolean; until: string; untilEdited: boolean;
  startOffset?: number; endOffset?: number;
  endMode: 'DURATION' | 'MANUAL'; durationMinutes: number;
}
export type DraftField = 'title' | 'category' | 'startDate' | 'startTime'
  | 'endDate' | 'endTime' | 'until' | 'description' | 'zone';
export interface TemporalChoice {
  offsetMinutes: number; instant: string; label: string;
}
export interface DraftIssue {
  field: DraftField; message: string; choices?: readonly TemporalChoice[];
}
export type DraftValidation =
  | { ok: true; payload: EventPayload; issues: readonly [] }
  | { ok: false; issues: readonly DraftIssue[] };
export interface RepeatPreview {
  count: number; firstDate: string; lastDate: string;
  untilDate: string; overLimit: boolean;
}
export interface ZoneChoice { value: string; label: string }
export type EventEditorOutcome =
  | { kind: 'saved'; mode: 'created' | 'updated'; event: PrivateEvent }
  | { kind: 'removed'; id: string };
```

`startDate`/`endDate` son fechas locales; `endDate` es último día incluido para ALL_DAY y fecha del fin para TIMED. `startTime`/`endTime` son HH:mm y siguen presentes al activar ALL_DAY. Los campos de control `endMode`, `durationMinutes`, `untilEdited` nunca llegan al servidor. El default de ALL_DAY cargado sin historia horaria es 09:00–10:00; sus fechas se preservan. `untilEdited` es true para una serie cargada o tras escribir fecha final; mientras sea false, cambiar inicio mantiene la sugerencia visible de +28 días.

Firmas congeladas; test_runner las consume desde `apps/agenda-ui/index.ts` antes de GREEN:

```ts
export function eventDraft(event: PrivateEvent | undefined,
  day: string, zone: string): EventDraft;
export function changeDraftStart(draft: EventDraft,
  value: { date?: string; time?: string }): EventDraft;
export function setDraftDuration(draft: EventDraft,
  minutes: 30 | 60 | 90): EventDraft;
export function changeDraftEnd(draft: EventDraft,
  value: { date?: string; time?: string }): EventDraft;
export function toggleAllDay(draft: EventDraft, allDay: boolean): EventDraft;
export function changeDraftZone(draft: EventDraft, zone: string): EventDraft;
export function changeDraftUntil(draft: EventDraft, until: string): EventDraft;
export function draftPayload(draft: EventDraft): EventPayload;
export function validateDraft(draft: EventDraft): DraftValidation;
export function repeatPreview(draft: EventDraft): RepeatPreview | null;
export function draftSummary(draft: EventDraft): string;
export function isDraftDirty(draft: EventDraft, baseline: EventDraft): boolean;
export function eventFailure(failure: unknown, draft: EventDraft):
  { message: string; issues: readonly DraftIssue[] };
export function eventFocusDay(event: PrivateEvent, viewZone: string): string;
export function zoneChoices(currentZone: string): readonly ZoneChoice[];
export function zoneLabel(zone: string): string;
```

- `draftPayload` serializa sin metadatos ni claves extra, llama al `parseAgendaEvent` vigente y conserva su error autoritativo. ALL_DAY endDateExclusive = endDate +1 día; TIMED usa `${startDate}T${startTime}`, equivalente para fin, y offsets solo cuando existen. No depender de zona local del proceso.
- `validateDraft` devuelve errores legibles, nunca lanza durante render; valida obligatorios y llama a dominio para serie/DST. Campos ordenados como en el formulario; título primero cuando falta. Fechas/horas incompletas no se convierten por Date en otro día. Fallo temporal de fin identifica endTime; fin multiday anterior identifica endDate. Hasta anterior o >53 identifica until.
- `repeatPreview` devuelve null si no es semanal o faltan fechas válidas/hasta anterior. Cantidad = floor(díasEntre(inicio,hasta)/7)+1; lastDate = inicio +7*(count-1); overLimit = count>53. Mantiene el número real aunque sea inválido. No sustituye validación de serie.
- `isDraftDirty` compara datos que se enviarían, sin llamar al parser ni depender de validez. Ignora expansión, modo/duración si no cambian horarios y untilEdited; en NONE ignora until, en ALL_DAY ignora horas/zona/offsets. Recortar título igual que dominio. Cambiar y restaurar los datos devuelve false.
- `eventFocusDay`: ALL_DAY → startDate; TIMED → dateAt(scheduleInstants(schedule).startAt, viewZone). Reutilizar barril de dominio y calendar; no truncar startLocal si las zonas son diferentes.
- `zoneChoices` contiene las ocho zonas actuales y la actual heredada sin duplicados; valores internos válidos. Labels ciudad/país, por ejemplo “Buenos Aires (Argentina)”, “Nueva York (Estados Unidos)”, “Madrid (España)”. Una zona válida heredada fuera de la lista conserva su valor con último segmento humanizado; no se sustituye silenciosamente. `zoneLabel` devuelve el texto completo “Hora de …” o “Hora universal”.

## DST: decisiones humanas representables

El dominio público entrega `INVALID_INPUT` con `details: {local, timeZone, choices:[{offsetMinutes,instant}]}`; huecos tienen choices vacío. La primera ocurrencia y futuras comparten shape: comparar local con el inicio/fin inicial del borrador antes de presentar opciones. Leer datos desconocidos defensivamente; errores incompletos se muestran sanitizados.

- Ambigüedad de inicio/fin de primera ocurrencia: ofrecer solo choices reales devueltos/validados por dominio, ordenados por instant. Etiquetas “Primera vez que ocurre la 01:30” / “Segunda vez que ocurre la 01:30”, con explicación del cambio de hora. La elección guarda offset interno para ese extremo, sin mostrar minutos crudos ni elegir primero automáticamente.
- Un solo valor válido ya seleccionado no requiere diálogo. Una opción alterada/inválida se rechaza por parseAgendaEvent. Si ambos extremos requieren elección, resolverlos sucesivamente conservando la primera elección válida.
- Hueco estacional: informar fecha y ciudad, pedir otra hora. No autodesplazar, omitir fecha ni ofrecer opción inexistente.
- Conflicto en fecha futura de serie: mensaje junto a until y horario: “El [fecha] esta hora cambia o se repite en [ciudad]. Elegí otro horario o terminá la serie antes de esa fecha”. Sin selector de offset por ocurrencia: el contrato actual no admite excepciones futuras. No aceptar eligiendo un offset para la primera fecha.
- Errores inesperados tienen ayuda general segura. Ninguna pantalla imprime JSON, stack, IANA crudo ni objetos temporales como explicación. La revisión guardada en conflictos usa los mismos formateadores humanos.

## Contrato del editor y composición

```ts
export interface EventEditor {
  draft: EventDraft; setDraft(value: EventDraft): void;
  busy: boolean; dirty: boolean; error: string;
  issues: readonly DraftIssue[]; conflict: boolean; stored?: PrivateEvent;
  save(): Promise<void>; remove(): Promise<void>; review(): Promise<void>;
  requestClose(): boolean;
}
export function useEventEditor(api: AgendaClient,
  original: PrivateEvent | undefined, day: string, zone: string,
  onSaved: (outcome: EventEditorOutcome) => void): EventEditor;
```

- Mantener firma posicional y contrato `AgendaClient` sin cambios. `save` valida antes de llamar API; fallo no escribe. save/remove tienen guard de conflict en el hook, además del disabled de la UI. Lock síncrono impide doble llamada incluso antes del rerender. Actualizar vía replace(id, revision, payload), crear vía put(id estable, payload). Usar el PrivateEvent devuelto como verdad confirmada del resultado.
- `onSaved` se llama exactamente una vez tras escritura confirmada. Rechazo/confirmación cancelada no llama callback. Outcome removed solo tras DELETE confirmado; no inventar evento ni tratarlo como saved.
- Alta semanal muestra resumen visible y no necesita confirmación de “cambios de serie”. Edición de una serie o conversión de evento existente a serie mantiene confirmación explícita de todas sus fechas, incluidas pasadas. Cancelar confirmación conserva borrador.
- `review` obtiene versión guardada, actualiza revisión CAS y `stored`, conserva draft. No limpia modificaciones ni reemplaza baseline por el evento remoto. Tras revisión, guardar requiere acción humana nueva. Revisar sin éxito no habilita reintento sobre revisión desconocida.
- `remove` conserva GET previo/revisión, confirmación y bloqueo por conflicto; resultado incierto no se reintenta como DELETE automático. `requestClose` devuelve false si busy; sin dirty devuelve true; con dirty solicita “¿Descartar los cambios del evento?” y devuelve la respuesta. EventForm usa esta ruta para Cancelar, cerrar y Escape.
- `EventForm` conserva props api/event/day/zone/onClose; onSaved ahora recibe EventEditorOutcome. `EventFields` recibe `{draft,onChange,issues}`; controles con name de DraftField. EventForm aplica foco después de publicar errores y abre secundario si hace falta. Exportar EventForm y useEventEditor por el barril para tests de comportamiento.
- `Agenda` cierra editor al outcome confirmado. Saved muestra éxito y acción Ver evento/Ver inicio de la serie; removed muestra eliminación sin navegación a un evento inexistente. Created selecciona eventFocusDay; updated conserva día/mes. El botón de ver selecciona primer día y enfoca la tarjeta por ID estable tras cargarla. `AgendaDay` puede recibir `focusEventId?: string`; tarjeta con tabIndex -1 y foco solo cuando existe.
- Cambiar mes deja que useAgenda consulte el nuevo rango; evitar recargar el rango viejo capturado por el callback. Si el rango no cambia, refrescar mediante la referencia actual de reload. Error al leer no revierte el éxito ni recrea editor: conservar reintento de consulta. Las protecciones de generación/abort y referencia vigente de J3/J4 siguen activas.
- Encabezado del calendario: usar mismo zoneLabel, dato discreto y acción secundaria “Cambiar” con ciudades legibles. Zona inicial resuelta por useAgendaView como ahora; no añadir geolocalización, persistencia nueva ni IANA libre. Mantener storage opcional y validación de zona guardada.

## ESTRATEGIA_EQUIPO_Y_PLAN_POR_SLICE

Contrato UI compartido publicado en este documento antes de RED; el barril y composición tienen un solo dueño. Misma rama/worktree ya autorizada, sin crear otro. Otros agentes trabajan en paralelo: no revertir sus cambios, no tocar sus registros. Nada de schema ni fetch para migraciones. Mantener Folder, Dialog, tokens y referencias existentes; UI nueva no implica dirección visual genérica.

| Unidad | Ownership de producción sugerido, exclusivo | Evidencia |
|---|---|---|
| F0 RED | test_runner: `tests/agenda-event-form-{model,editor,view}.test.mjs` y helper propio si necesita; tests únicamente | Tests desde barril; fallos de comportamiento/export faltante observados. Ningún stub de producción para fingir RED. |
| F1 borrador | worker A: `apps/agenda-ui/{event-draft-types.ts,event-draft.ts,event-draft-time.ts,event-validation.ts,event-summary.ts,event-zones.ts,event-result.ts}` | Helpers/export names exactos de arriba. Comparte owner A con F2; no escribe TSX ni tests. |
| F2 editor | worker A: `apps/agenda-ui/{useEventEditor.ts,index.ts}` | Validar, CAS/draft, lock, guard conflict, cierre, callback resultado y exports comunes. Sin relajar tests. |
| F3 presentación | worker B: `apps/agenda-ui/{EventForm.tsx,EventFields.tsx,EventWhenFields.tsx,EventRepeatFields.tsx,EventAdvancedFields.tsx,EventZoneFields.tsx,agenda.css}` | Tres grupos compactos, secundarios, DST humano, responsive Folder. Solo uno edita CSS. |
| F4 composición | worker B: `apps/agenda-ui/{Agenda.tsx,AgendaDay.tsx}`; añadir `AgendaHeader.tsx`/`AgendaZoneControl.tsx` si hace falta dividir; coordinador: `scripts/test-agenda.mjs` para incluir suites nuevas | Outcome, refresco/selección/foco; J3/J4. Barril solo worker A; componente/composición solo worker B. useAgendaView.ts se conserva; si fuera imprescindible tocarlo, avisar al coordinador antes de editar. |
| F5 verificación | test_runner: solo tests/evidencia propia; reviewer: diff y registro propio | Funcional independiente + capturas nuevas, sin atribuir aceptación visual al DOM. Coordinador actualiza docs/agenda.md y roadmap solo tras evidencia. |

F1/F2 pertenecen a worker A y F3/F4 a worker B; pueden trabajar con interfaces congeladas y rutas disjuntas después de RED. A publica exports antes de correr GREEN. Dividir archivos nuevos antes de 200 líneas y funciones antes de 40. Dividir commits por unidades <=400 líneas; no exigir que el conjunto completo del formulario quepa en un solo commit. Composición no absorbe infraestructura del preview.

## CRITERIOS_DE_TEST_DOT

Tests deben observar resultados/llamadas reales de helpers, hook y componentes. No buscar textos de implementación como sustituto de ejecución. Reutilizar loadTsModule/hookView existentes; no añadir dependencia de testing. Selectores accesibles y nombres de campos se prueban semánticamente, no puntuación exacta del resumen.

| Grupo | Casos obligatorios antes de declarar GREEN |
|---|---|
| Borrador / payload | Alta default 09–10/zona calendario; edición TIMED preserva zona/horas/offsets/fin manual; ALL_DAY inclusive→exclusivo; payload sin metadatos ni claves nuevas. Sin dependencia TZ del proceso. |
| Duración / toggle | 30/60/90 calculan fin; 23:30 +90 cruza fecha; cambiar inicio en auto mantiene duración; en manual no mueve fin. Toggle ALL_DAY ida/vuelta conserva 18:15–19:45, multiday y offsets vigentes; cambiar fechas/horas/zona invalida offsets afectados. ALL_DAY de origen recupera 09–10. |
| Semanal / resumen | Opt-in, default +28=5; untilEdited evita mover límite escrito; inclusive mismo día=1; 53 válido/54 inválido sin clamp; hasta anterior error. Resumen con día real, cantidad/última fecha y ALL_DAY multiday; datos incompletos no lanzan. |
| Zona / DST | Etiqueta/selector legibles con valor IANA interno y zona heredada; cambio conserva pared local y limpia offsets. New York 2026-11-01 01:30 ofrece dos choices válidos, ninguna preselección; elige uno y payload lo refleja. 2026-03-08 02:30 hueco sin choices. Serie 2026-10-25→11-08 01:30 y 2026-03-01→03-15 02:30 reportan conflicto futuro sin selector por ocurrencia; nunca JSON. |
| Editor / cierre | Campos inválidos no llaman API; primer error publicado/enfocado y secundario abierto. Doble save pendiente produce una llamada/callback; fallo conserva draft e ID de reintento. Busy no cierra; pristine sin confirm, dirty cancel conserva, dirty confirmar cierra, modificar/restaurar no dirty. Presets/expandir por sí solos no dirty. |
| CAS / serie | Edición usa revisión; CONFLICT mantiene draft y bloquea escritura; review conserva draft y adopta revisión remota, requiere nuevo save. Borrado revisa versión. Aviso/confirmación edición serie incluye pasado; cancel no escribe; alta semanal no muestra confirmación de cambios pasados. |
| Resultado / rango | API devuelve PrivateEvent utilizado en outcome; created fuera de mes selecciona día correcto convertido a zona de vista; updated conserva selección, Ver inicio lleva a primera fecha incluso pasada. Refresh falla después de una escritura confirmada: éxito+reconsulta, ninguna segunda escritura. Ver evento enfoca tarjeta existente. Removed no ofrece abrir evento. |
| Regresiones existentes | Mantener agenda-ui J3 acceso revocado, J4 open tardío tras cambio de mes, cliente/proxy/contratos/time/events. Cambios en callbacks no restauran rangos/cargas antiguos ni datos revocados. |
| Integración Docker `_test` | Reutilizar suites de Agenda y fixtures desechables: CRUD idempotente, CAS, privacidad, ALL_DAY y serie con rechazo DST; comprobar payload del nuevo formulario en sesión/API real. Sin migración ni filas retenidas. Mantener rollback/cleanup propio observado. |
| ego(lite) | Space dedicado: crear clase semanal, evaluación única y día completo, editar serie pasada, fin manual, alternar sin pérdida, error/foco y dirty discard con teclado. Desktop/móvil: opciones secundarias, controles/categorías, footer accesible, sin desborde, resultado visible y Ver evento. Capturas nuevas de estados principales; si capture falla, registrar límite y no declarar aceptación visual. |

RED: `node --test --test-concurrency=1 tests/agenda-event-form-model.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-form-result.test.mjs`; guardar el fallo real. GREEN: el mismo comando, `npm run test:agenda` con suites nuevas registradas, `npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build`, verificación independiente/ego y revisión. No ampliar plazos, reinstalar servicios o alterar fixtures retenidos para obtener PASS.

## Tareas y handoff exacto

- [x] F0 contrato/DoR de esta mejora terminado; reglas reversibles declaradas, sin decisión humana bloqueante.
- [x] F0 test_runner: RED independiente registrado; 29 casos en cuatro suites antes de implementación.
- [x] F1–F4 implementación con owners disjuntos y barril/composición por un único agente; 35 casos nuevos GREEN, tipos y build final correctos.
- [x] F5 pruebas independientes, navegador funcional, revisión y cierre documental atribuible. Captura final intentada una vez: timeout, cero píxeles; aceptación visual no disponible.

Siguiente acción: prueba manual del usuario en http://127.0.0.1:58411/agenda antes de decidir integración. El coordinador conserva la API/base del preview existente y sirve la compilación nueva en el mismo origen. [Verificación independiente](../../docs/work-log/2026-10-24-compact-form-verify.md) y [cierre/commits](../../docs/work-log/2026-10-24-root-compact-event-form.md). Este diseño no autoriza push, integración a main, publicación o despliegue.
