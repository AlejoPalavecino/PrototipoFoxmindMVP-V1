# Color persistido de eventos privados de Agenda

ESTADO_DISENO: LISTO_PARA_TDD_RED

El usuario autorizó elegir color en los eventos personales, continuar en la rama/worktree actual y conservar eventos y preview previos. Este contrato amplía [Agenda](agenda.md) y el [formulario compacto](agenda-compact-event-form.md); su alcance es local. El coordinador conserva el roadmap y la instancia previa; preparará otra preview actualizada sin reiniciar el backend que mantiene datos/claves efímeras. No hay publicación ni integración a main en este corte.

## DoR y supuestos asumidos

| Dimensión | Decisión verificable |
|---|---|
| Datos / idempotencia | Seis tokens finitos opcionales. Automático omite `color` en JSON y representa SQL NULL. Sin backfill/default. PUT idéntico previo sigue devolviendo el mismo evento; distinto color para el mismo ID da CONFLICT. |
| Estados | Alta, edición y lectura preservan token; volver a Automático elimina la propiedad y guarda NULL. Categoría sigue siendo un dato distinto; cambiarla no sobrescribe una elección explícita. |
| Fallos / atomicidad | Color se guarda con el evento en la transacción existente. Cualquier error conserva borrador/color; color inválido no llega a escritura. Sin guardar preferencia global ni una segunda solicitud de color. |
| Concurrencia | Un cambio solo de color usa la misma revisión CAS. El conflicto conserva borrador, review muestra color remoto y requiere nuevo guardado. Edición semanal cambia todas sus ocurrencias, incluidas pasadas, con confirmación vigente. |
| Permisos | Solo dueño autenticado. Mismos Origin/CSRF y denegación de IDs ajenos/inexistentes. Entregas académicas, aulas, plazos y permisos no reciben color editable. |
| GRASP | Dominio valida tokens, repositorio serializa columna y UI traduce tokens a etiquetas/clases. Sin CSS/hex en dominio, puertos nuevos, biblioteca ni proveedor adicional. |

Los tokens y tonos son decisiones técnicas reversibles de esta entrega, no reglas históricas ni elecciones humanas adicionales. Se conserva TypeScript estricto/Next.js/Nest/PostgreSQL. No es Greenfield y no requiere entrevista de stack. Engram no se escribe sin identidad registrada; el contrato versionado permite recuperar la tarea.

## CONTRATO_EXACTO_Y_COMPATIBILIDAD

Ampliar `src/core/domain/agenda.ts`, consumido exclusivamente por su `index.ts` público:

```ts
export const EVENT_COLORS = ['BLUE', 'GREEN', 'YELLOW',
  'ORANGE', 'PINK', 'PURPLE'] as const;
export type EventColor = (typeof EVENT_COLORS)[number];
export interface EventPayload {
  title: string; description: string; category: EventKind;
  schedule: EventSchedule; repeat: EventRepeat; color?: EventColor;
}
```

`PrivateEvent` hereda la propiedad opcional; `EventOccurrence.event` la transporta sin duplicarla. Ninguna otra interfaz de dominio, puerto, endpoint ni firma de `AgendaClient` cambia. `parseAgendaEvent(input: unknown): EventPayload` permite `color` además de las claves actuales y valida pertenencia exacta a `EVENT_COLORS`. Rechaza null, AUTO/AUTOMATIC, vacío, minúsculas, número, objeto, hex y CSS libre con INVALID_INPUT; no coerciona. `undefined` tiene semántica de omisión. El output añade la propiedad solo si hay token válido; título/description/category/schedule/repeat mantienen su orden/valores actuales. Para una entrada histórica sin color, `Object.hasOwn(output, 'color')` es false y `JSON.stringify(output)` permanece igual al resultado histórico.

Persistencia observada: `prisma/schema.prisma` declara columnas de AgendaEvent; `event-row.ts`/`event-repository.ts` usan SQL explícito y no existe JSON de evento. Es necesaria una migración aditiva, sin modificar migraciones históricas:

```sql
ALTER TABLE agenda_events ADD COLUMN color TEXT;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_event_color
  CHECK (color IS NULL OR color IN
    ('BLUE','GREEN','YELLOW','ORANGE','PINK','PURPLE'));
```

El coordinador informó `git fetch origin` exit0 y reconcilió el nombre: `prisma/migrations/202610240001_agenda_event_color/migration.sql`. Prisma añade `color String?`; sin índice, enum SQL, NOT NULL, DEFAULT o UPDATE de filas anteriores. SQL NULL se mapea a propiedad omitida; token se conserva. `eventValues` añade `payload.color ?? null` al final. INSERT/UPDATE/SELECT/RETURNING incluyen columna y placeholders alineados; el nuevo color ocupa $18 y revisión CAS pasa de $18 a $19, siempre condicionada por dueño/revisión. El replace completo con payload sin color limpia un color anterior a NULL.

`AgendaService.put` reconstruye el payload previo para igualdad incorporando color solo si está definido antes de `parseAgendaEvent`. Mismo token es retry idempotente, tokens distintos o omitido frente a explícito dan CONFLICT sin mutar. No resolver la igualdad mediante color efectivo por categoría: Automático y una selección explícita son elecciones distintas. Ninguna respuesta histórica añade `color:null`, `color:undefined` como propiedad propia, AUTO ni un token calculado. Mantener revisión, IDs y timestamps de un PUT idempotente.

## Borrador y presentación pública

En `apps/agenda-ui/event-colors.ts`, exportado por el barril:

```ts
export type EventColorChoice = EventColor | 'AUTO';
export interface EventColorOption {
  value: EventColorChoice; label: string; className: string;
}
export const eventColorOptions: readonly EventColorOption[];
export function eventColorClass(
  event: Pick<EventPayload, 'category' | 'color'>): string;
export function eventColorLabel(color: EventColor | undefined): string;
```

Orden de opciones: AUTO/Automático, BLUE/Azul, GREEN/Verde, YELLOW/Amarillo, ORANGE/Naranja, PINK/Rosa, PURPLE/Violeta. Clases: `agenda-color-auto`, `agenda-color-blue`, etc. `eventColorClass` devuelve `agenda-color-${token.toLowerCase()}` para explícito; para omitido devuelve exactamente `category.toLowerCase()` vigente, preservando las reglas visuales históricas. `eventColorLabel(undefined)` devuelve Automático. El catálogo usa un mapeo exhaustivo por EventColor; no aceptar claves arbitrarias como clases.

`EventDraft` añade `color: EventColorChoice`; `DraftField` añade `'color'`. `eventDraft` usa `event?.color ?? 'AUTO'`, preserva tokens en edición y nunca los deduce de categoría. `draftPayload` añade `{color}` solo si no es AUTO. `isDraftDirty` compara la elección de color, incluso en ALL_DAY/NONE: solo cambiar color es dirty, restaurarlo deja pristine. Cambiar categoría con AUTO conserva AUTO y cambia el aspecto efectivo por categoría; con explícito conserva el token. `validateDraft` ante token de borrador inválido devuelve issue `color` legible, sin llamada API ni error temporal engañoso.

`EventColorFields({draft,onChange,issues}: EventFieldProps)` se integra en “Qué voy a organizar”, después del título/ayuda. Exportarlo por el barril para prueba de comportamiento; no cambiar `EventFields`, `EventForm` ni `useEventEditor` en sus firmas públicas. Grupo visible “Color del evento”, siete radios nativos con `name="color"`, valores exactos, etiquetas de texto, muestra cromática decorativa y selección checked/marca visible. Tab/flechas/Espacio funcionan nativamente; foco visible, sin tooltip obligatorio. Texto de ayuda: “Automático usa el color de la categoría”. Cambiar color no envía al servidor hasta guardar. Errores de color se asocian por `fieldAria`/`FieldIssue` y reciben foco. La revisión remota muestra `Color: <etiqueta>` junto a los demás datos conservados.

Paleta propuesta para clases explícitas; colores solo en CSS UI, texto del producto `--fm-ink: #202522`:

| Token / nombre | Fondo | Acento de borde/indicador | Texto/fondo | Acento/fondo |
|---|---|---|---|---|
| BLUE / Azul | #DBEAFE | #1D4ED8 | 12,76:1 | 5,49:1 |
| GREEN / Verde | #DCFCE7 | #166534 | 14,17:1 | 6,49:1 |
| YELLOW / Amarillo | #FEF3C7 | #854D0E | 13,98:1 | 6,15:1 |
| ORANGE / Naranja | #FFEDD5 | #9A3412 | 13,58:1 | 6,38:1 |
| PINK / Rosa | #FCE7F3 | #9D174D | 13,24:1 | 6,71:1 |
| PURPLE / Violeta | #F3E8FF | #6B21A8 | 13,19:1 | 7,39:1 |

Ratios calculados por luminancia relativa; no son aceptación visual. Mantener texto, categoría/Privado/Semanal y foco; color nunca transmite el único significado. No aplicar acento al texto de fecha atenuado ni pintar botones. En colores forzados, conservar radios nativos, marcas y bordes de sistema.

`AgendaMonth` aplica `eventColorClass` solo a PRIVATE_EVENT en sus previews; ACADEMIC_DEADLINE conserva `deadline`. En móvil el CSS actual oculta previews: añadir una fila independiente de indicadores visibles (hasta tres y overflow si hay más), usando el mismo helper para privados y tratamiento actual para entregas. Conservar contador total y aria-label del día; indicadores decorativos aria-hidden, sin controles interactivos dentro del botón de día. No basta colorear previews que siguen ocultos.

`AgendaDay` aplica el helper a cada artículo privado: fondo suave/borde lateral solo para clases explícitas; Automático mantiene presentación previa. Categoría/título/hora/acciones siguen legibles; tarjetas académicas y Próximas entregas conservan su aspecto. Todas las ocurrencias heredan el token de la serie, sin excepciones ni edición por ocurrencia. Recargar página y reabrir editor debe recuperar la elección persistida.

## OWNERSHIPS_RUTAS y estrategia de equipo

Contrato congelado primero y un único owner por barril. Misma rama/worktree autorizada; no abrir otra rama ni usar main. Antes de migración nueva, el coordinador realiza `git fetch origin` y reconcilia nombres sin traer trabajo ajeno. Si fetch falla, registrar causa y comprobar colisiones locales; no sustituir identidad ni exponer credenciales.

| Unidad / owner exclusivo | Archivos de producción o prueba |
|---|---|
| C0 RED, test_runner | Nuevos `tests/agenda-event-color-{contracts,model,view,database}.test.mjs`, helper propio si necesario; actualizar solo assertions legítimas de inventario en tests P4/P5/P8. |
| C1 contrato/persistencia, worker A | `src/core/domain/{agenda.ts,agenda-validation.ts}`, `prisma/schema.prisma`, nueva migración; `apps/api/src/agenda/{event-row.ts,event-repository.ts,agenda-service.ts}`. Barril dominio existente exporta todo, sin edición necesaria. |
| C2 borrador/UI, worker B | `apps/agenda-ui/{event-draft-types.ts,event-draft.ts,event-validation.ts,event-colors.ts,EventColorFields.tsx,EventFields.tsx,EventForm.tsx,AgendaMonth.tsx,AgendaDay.tsx,agenda.css,index.ts}`. Único owner del barril UI y CSS. Si CSS excede 200 líneas, extraer `event-colors.css` e importarlo desde agenda.css. |
| C3 harness, coordinador | `scripts/{test-agenda.mjs,p4-integration-runtime.mjs}`; registrar suites nuevas y actualizar inventario real a 11/latest color, manteniendo comprobación exacta de migraciones aplicadas. Preview aislada nueva y cierre documental. |
| C4 verificación/review | test_runner valida de forma independiente y escribe registro propio; reviewer revisa diff y reporta; coordinador actualiza roadmap tras pruebas. |

No revertir cambios ajenos. Workers no editan tests; test_runner no implementa producción. Cada archivo nuevo/modificado permanece <200 líneas y cada función <40; dividir unidades/commits a <=400 líneas. Los inventarios estáticos adicionales detectados están en `tests/{p4-integration,p5-integration,p8-grading-integration,p8-grading-reload-integration,p8-publication-integration,p8-publication-tp-integration}.test.mjs`; `p8-migration-inventory` comprueba parte de ellos. Cambiar solo expectativa real, sin saltar ni relajar pruebas. Los fixtures Agenda/P3/P33 ya recorren migraciones dinámicamente.

## CRITERIOS_DOT_Y_COMANDOS

Pruebas desde barriles públicos con `loadTsModule`/React y hooks existentes; verificar comportamiento ejecutado, no buscar strings de implementación. Nuevo test de servicio color puede usar fixture propio en la suite contracts, exportando solo helpers de pruebas si evita archivos >200 líneas.

| Grupo | Prueba obligatoria |
|---|---|
| Contrato | Seis tokens exactos en TIMED y ALL_DAY/serie; omisión/undefined producen output histórico sin propiedad propia y JSON igual; null/AUTO/hex/CSS/minúsculas/número/objeto/extra rechazados. |
| PUT / CAS | Mismo token devuelve created:false y evento original; cambiar color o omitido↔token da CONFLICT sin mutar. PUT legacy idéntico continúa idempotente. Replace solo color incrementa revisión; omisión limpia token; revisión vieja rechazada y privado ajeno denegado. |
| Borrador/editor | Nuevo/legacy AUTO; cargar explícito; payload AUTO omite; seleccionar color/restaurar dirty true/false en TIMED/ALL_DAY. Categoría no borra explícito; temporal/duración/toggle preservan token. Error conserva elección, doble save sigue una escritura; conflicto/review conserva elección local y muestra remoto, nuevo save usa revisión vigente. |
| Presentación | Siete radios con labels/checked/name/color, error asociado y foco; callback cambia borrador sin guardar. Helper devuelve clases finitas y categoría legacy. Mes, indicadores móviles y artículo del día usan token; entregas siguen deadline/tarjeta académica. Revisión guardada incluye etiqueta de color. |
| Docker `_test` | Aplicar migraciones previas, insertar fila sin color y snapshot de datos/revisión/timestamps; aplicar nueva y demostrar mismo snapshot + NULL. Crear cada token, nueva instancia GET/list, reintentos PUT y clear→NULL con lectura sin propiedad. CHECK rechaza token inválido SQLSTATE23514 con savepoint/rollback; CAS color concurrente tiene un ganador. Rollback por caso y cleanup de recursos propios observado. |
| Regresiones | Suites Agenda originales, compact form, DST, serie, privacidad, CSRF, J3/J4 y contratos de entregas; token se hereda en todas las ocurrencias. Inventario de migraciones exacto actualizado, sin modificar reglas existentes. |
| ego(lite) | Space dedicado y pasos agrupados: desktop crear Azul, recargar/reabrir, solo editar a Violeta, restaurar Automático; ALL_DAY y serie con confirmación/cancelación sin pérdida. Teclado de radios, dirty/cierre y contraste. Móvil confirma indicadores visibles de colores y overflow sin desborde; abrir día preserva título/categoría/hora. Entrega académica conserva color. Capturas nuevas; un fallo de capture se registra sin atribuir aceptación por DOM. |

RED: `node --test --test-concurrency=1 tests/agenda-event-color-contracts.test.mjs tests/agenda-event-color-model.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-event-color-database.test.mjs`. Observar fallo real antes de C1/C2; no implementar stubs para fingir RED. GREEN repite el comando y `npm run test:agenda`, `npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build` y `node --test tests/p8-migration-inventory.test.mjs`; prueba de migración incremental e integración real requieren `_test` propio. API build ocurre dentro del runner Agenda. No ejecutar pruebas que lean archivos secretos o usen datos retenidos.

## Estado y handoff

- [x] C0 diseño y DoR, sin ambigüedad crítica ni confirmación redundante pendiente.
- [x] C0 RED observado por test_runner antes de producción:1PASS/15FAIL.
- [x] C1 contrato/SQL y C2 UI GREEN con owners disjuntos;16pruebas iniciales y47UI/regresiones finales correctas.
- [x] C3 runner/inventarios11 y preview aislada http://127.0.0.1:63122/agenda; datos originales conservados, web anterior detenido para compilar sin conflicto.
- [x] C4 verificación independiente funcional, revisión y cierre atribuible; una captura falló por ventana minimizada,0píxeles/sin aceptación visual. Cuatro eventos QA eliminados y Space7 cerrado.

Siguiente acción: prueba manual del usuario en la nueva preview, con el mismo acceso sintético ya proporcionado; no integrar todavía. [Diseño previo a RED](../../docs/work-log/2026-10-24-event-color-design.md), [verificación independiente](../../docs/work-log/2026-10-24-event-color-verify.md) y [coordinador/commits](../../docs/work-log/2026-10-24-root-agenda-event-color.md). La evidencia funcional y de geometría no equivale a aceptación por píxeles ni aprobación nativa. Sin push, PR, integración a main o despliegue.

## Entrega local posterior — 2026-10-24

El usuario probó los colores, los aceptó y autorizó integrar la agenda a main. Integración local observada en32fecce3;93pruebas finales y tipos estrictos pasaron. [Registro de integración](../../docs/work-log/2026-10-24-root-agenda-main-integration.md). Preview vigente http://127.0.0.1:49642/agenda. Sustituye el próximo paso histórico de prueba previa; no hubo push, PR ni despliegue. La aceptación manual del usuario no se atribuye a capturas automatizadas inexistentes.
