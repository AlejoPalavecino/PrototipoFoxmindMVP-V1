# Diseño del frontend (F3–F11 de la auditoría)

- **Alcance autorizado:** hallazgos F3–F11 de la [auditoría](2026-11-26-root-full-stack-audit.md), salvo F1 y F2, en cortes aprobados por el usuario el 2026-11-26. Sin cambios visibles de producto. Commits en la rama propia; push, PR o merge no autorizados.
- **Rol:** sesión lateral iniciada por la sesión coordinadora; único escritor de este registro y de [su tablero](../../odd/tasks/audit-frontend-design.md).
- **Rama y worktree:** `claude/audit-frontend-71cf98` en `.claude/worktrees/audit-frontend-71cf98`, desde `main` en `a06c9214`.
- **Fuera de alcance:** `apps/web/src/application/server/` (F1/F2 en la sesión coordinadora).

## Decisiones

- Formateador (F7): sólo sobre los archivos con líneas largas, fuera de `application/server/`; la regla de F9 impide que vuelvan.
- F8: diferido hasta integrar F1, coordinado con la sesión principal. El tope fijo de 10 s está en `apps/api/src/modules/files/uploads/presentation/http.ts:46`, junto a un corte por inactividad.
- Token CSRF (F5): se reutiliza sólo si la API lo acepta más de una vez.

## Cortes

### Corte 1 · reglas de hooks (F4)

- Se instaló `eslint-plugin-react-hooks@7.1.1` y `lint:boundaries` aplica `rules-of-hooks`, `exhaustive-deps` y `set-state-in-effect` como error en web y shared-ui.
- Al activarlas marcaron 114 casos en 65 archivos: 31 de `exhaustive-deps` y 83 de `set-state-in-effect`. Los 31 se corrigieron sin cambiar cuándo se dispara cada efecto. Se usó `useEffectEvent` para leer callbacks y estado vigente; `useScopedValue` (nuevo, `apps/web/src/shared/`) para los clientes que se recrean a propósito al cambiar de cuenta o materia; y alias locales cuando la regla confundía `state.current` con una ref.
- Los 83 de `set-state-in-effect` quedan en `eslint-suppressions.json`: un caso nuevo falla y una supresión sobrante también. Se bajan en los cortes siguientes.
- Los simuladores de hooks de cuatro pruebas implementan `useEffectEvent`.
- Comprobación: `npx tsc --noEmit -p apps/web/tsconfig.json` sin errores; `npm run web:build` exit 0; `npm run lint:boundaries` pasa; `npm run test:complete -- --group fast` 3224/3224 (la primera corrida falló 11 en `use-foxy-workspace-actions.test.mjs` por un simulador sin `useEffectEvent`; corregido); `npm run docs:check` 0 problemas. Toca código de pantallas sin cambiar su comportamiento; la verificación en el navegador se hace junto con el corte siguiente, que también toca efectos.

### Corte 1b · efectos que sólo reinician estado (F4)

- Nuevo `useResetOnChange` (`apps/shared-ui/`). Reemplaza 12 efectos que sólo reiniciaban o ajustaban estado al cambiar una prop, en `AppNavbar`, `FoxyChatLayout`, `FoxyResourceWorkspace`, `ClassroomSettings`, `study-workspace`, `MaterialPublishing`, `ActivityGeneration` y `foxy-visual-reader-dialog`. Conserva el orden y la corrida inicial de cada efecto original. Las supresiones bajan de 83 a 71.
- Quedan fuera los efectos de `Activities`, `foxy-workspace` y `ActivityAuthoring`, que se reescriben en F3, y `use-chat-follow`, que además escribe una ref.
- Prueba nueva: `tests/react-state-helpers.test.mjs` (3 casos, `useResetOnChange` y `useScopedValue`), registrada en el inventario y en la ruta `fast`.
- Comprobación: `tsc` sin errores; `web:build` y `api:build` exit 0; `lint:boundaries` pasa; `test:complete --group fast` 3227/3227; `docs:check` 0 problemas.
- Navegador (cortes 1 y 1b): entorno descartable de `node scripts/documentation-preview.mjs` (corrida `documentation-preview-390d5bc33327d797`), con IA sintética. Se ingresó con la cuenta docente sintética de su fixture, que se leyó con autorización de la sesión coordinadora; no se copiaron credenciales. Se comprobó: Inicio y miniagenda cargan; aula → Plan → «Subir archivo» abre la subida y «Cancelar» la cierra; Biblioteca; Ajustes → cambiar el nombre marca «Tenés cambios sin guardar», y al guardar muestra «Cambios guardados.» con el nombre nuevo en el encabezado; Foxy AI → Historial abre y cierra; `/agenda?create=1` abre el editor y limpia la URL; en mobile (375×812) el menú abierto se cierra al navegar a Agenda. Consola: sólo un 404 de una URL mal tipeada por el verificador. El entorno se bajó con su stopFile y borró el fixture.

### Corte 2 · líneas de producción acotadas (F7)

- Se instaló `prettier@3.9.10` con `.prettierrc.json` (120 columnas, comillas simples, coma final, flechas sin paréntesis) y se formatearon sólo los 57 archivos de web y shared-ui con líneas de más de 400 caracteres. `application/server/` quedó afuera. Commit aislado y mecánico: 57 archivos pasan de 4833 a 16 800 líneas.
- Resultado: 0 líneas de más de 400 caracteres fuera de `server/` (antes 124). Siguen 38 de más de 300 y 280 de más de 200, sobre todo cadenas y clases que Prettier no corta.
- Cuatro pruebas validaban el código como texto y dependían de cómo estaba cortado: `expedition-home`, `p8-grading-client`, `p8-publication-client` y `p8-progress-client`. Ahora colapsan los espacios antes de comparar y aceptan el paréntesis que Prettier agrega al JSX de varias líneas. Comprueban lo mismo que antes.
- Comprobación: `tsc` sin errores; `web:build` exit 0; `lint:boundaries` pasa; `test:complete --group fast` 3227/3227 (dos corridas previas cortaron en esas pruebas; corregidas); `docs:check` sin problemas. Prettier conserva el significado del JSX, incluidos los espacios; no se recorrió en el navegador como corte aparte, y las pantallas formateadas se vuelven a ver en los recorridos de F3.

### Corte 3 · sin código alcanzado sólo por pruebas (F10, F11)

- F10: se retiró `application/workflows/classroom-workspace/PlanWorkspace.tsx`, un envoltorio de 8 líneas que sólo cargaban 6 pruebas. Ahora cargan el `PlanWorkspace` real de `features/curriculum/plan/` con `tests/helpers/plan-workspace.mjs`, que le pasa las mismas props de presentación que `Plan.tsx` en producción.
- Un recorrido de imports (estáticos, dinámicos y `@import` de CSS) desde `apps/web/pages` y `proxy.ts` encontró 12 archivos más que ninguna entrada alcanza, y se retiraron: `AgendaAfterDay.tsx`, `agenda/upcoming/Upcoming.tsx`, `study/ui/study-materials.tsx`, y en shared-ui `AccountStory`, `CollectionStateFilter`, `CreationReview`, `CreationSteps`, sus dos módulos CSS, `entry-glass.css` (no aparecía en el CSS compilado), `navbar-motion.ts` y `plan-disclosure.ts`. Con ellos se fueron las pruebas que sólo los cubrían: 7 casos en 5 archivos, más `tests/education-agenda.test.mjs` y `apps/shared-ui/plan-disclosure.test.mjs`, que también salieron del inventario, de las rutas y de `ci-suites`. Al repetir el recorrido no quedan huérfanos.
- F11: las 21 pruebas de `features/foxy/model/` y `features/foxy/ui/` pasaron a la carpeta del módulo que prueban (conversations, collections, resources, publication, visuals, workspace); `ui/` desapareció. `model/` conserva `classroom-port.ts`, que es código de producción. Las pruebas siguen cargando por ruta con `loadTsModule`, como el resto del repo.
- Documentación: `docs/design/README.md` apunta a los componentes que hoy implementan el selector de estado y los pasos. El registro del 12/11 enlaza `study-materials.tsx` en la versión anterior de Git. Los manifiestos y registros históricos conservan sus rutas de entonces.
- Pendiente detectado: `useAgenda` conserva las consultas `upcoming` y `afterDay`, que `Agenda` nunca activa (`calendarOnly`); retirarlas cambia un hook vivo y queda para un corte propio.
- Comprobación: `tsc` sin errores; `lint:boundaries` pasa; `docs:check` 0 problemas; `test:complete --group fast` 3219/3219 (8 casos menos, los del código retirado); ninguna suite ni script nombra los archivos retirados.

### Corte 4 · capas de aplicación sin ciclo (F6)

- `check-frontend-architecture.mjs` suma dos reglas: `application/transport` no importa de `application/clients`, y `application/navigation` no llama a `fetch` ni crea `EventSource`. Las dos pruebas nuevas de `tests/frontend-boundaries.test.mjs` fallaron primero (RED); sobre el código real, la regla marcó `transport/classroom-client.ts` → `clients/academic-response.ts` y `navigation/ai-quota-client.ts:59,77`.
- GREEN: `academic-response.ts` pasa a `transport/`, que es quien decodifica, y `ai-quota-client.ts` pasa a `clients/`. Se actualizaron sus imports y dos pruebas. Sin cambio de comportamiento.
- Comprobación: `tsc` sin errores; `lint:boundaries` pasa; `test:complete --group fast` 3221/3221 (+2 pruebas de la regla); `docs:check` 0 problemas.

### Corte 5 · la regla de arquitectura controla tamaño (F9)

- `check-frontend-architecture.mjs` mide el código de producción de web y shared-ui: líneas de hasta 200 caracteres, archivos de hasta 500 líneas y hasta 10 llamadas a `useState` por archivo (contadas en el AST). Los 108 archivos que hoy superan algún límite están en `scripts/frontend-size-baseline.json`, con su valor actual. Un valor que crece falla. Uno que baja también falla hasta que se achica la línea base con `--shrink-size-baseline`, que nunca agrega archivos ni sube valores.
- `application/server/` queda fuera hasta que se integre F1; está avisado en la nota compartida de las sesiones.
- Pruebas: tres casos nuevos en `tests/frontend-boundaries.test.mjs` (límites en archivos nuevos, línea base que sólo baja, exclusión de `server/`). Fallaron primero porque la función no existía.
- Comprobación: `lint:boundaries` pasa; `test:complete --group fast` 3224/3224 (+3); `docs:check` 0 problemas.

### Corte 6 · base común de los clientes HTTP (F5, primera parte)

- `ClientError` (`src/core/contracts/client-error.ts`) es la base de `AccountError`, `AgendaClientError`, `HomeClientError`, `FileClientError`, `FoxyClientError` y `StudyError`: cada una conserva su clase y sus mensajes. Va en `src/core` porque la regla de capas sólo deja que la API de una feature importe de ahí. `ApiError` (core) no cambió.
- `createCsrfSource` (`apps/web/src/shared/http/csrf.ts`): el token se lee una vez por instancia de cliente; quien cancela mientras se lee recibe `AbortError` sin afectar a otros. Lo usan el transporte académico (aulas, biblioteca, autoría, corrección) y el de agenda. Se comprobó en el código de la API (`configuration.ts`, HMAC de la sesión) que el token sirve hasta que la sesión rota.
- Sin reintento implícito: `agenda-client-http.test.mjs` exige «un solo pedido de negocio». Ante `CSRF_INVALID` se descarta el token, el error llega a la persona y el intento siguiente lee uno nuevo. La primera versión reintentaba y esa prueba la frenó.
- Contrato que cambia por la decisión del usuario: `p5-web-client.test.mjs` exigía pedir el CSRF en cada mutación; ahora exige reutilizarlo.
- Identidad sigue pidiendo el token en cada mutación, a propósito (rota la sesión).
- Pendiente (decisión del usuario): Foxy, Estudio, Archivos y adjuntos de chat siguen pidiendo el CSRF antes de cada mutación con su propio código. Sus API de feature no pueden importar `shared/`: hace falta llevar la fuente CSRF a `src/core` o inyectarla desde la composición.
- Pruebas: `tests/web-http-shared.test.mjs` (7 casos: caché, cancelación, sin reenvío, transporte académico, agenda, base de errores), registrada en el inventario y en la ruta `fast`.
- Comprobación: `tsc` sin errores; `api:build` exit 0; `lint:boundaries` pasa (la primera versión ponía `ClientError` en `shared/` y la regla de capas la rechazó); `test:complete --group fast` 3231/3231.

### Corte 8 · `ActivityAuthoring` separa estado y render (F3)

- Restricción de diseño: muchas pruebas renderizan estos componentes con un simulador de hooks que no expande subcomponentes con estado. Partir el render en componentes las rompería sin mejorar el diseño, así que F3 separa responsabilidades de estado en hooks con nombre propio y el render queda igual.
- `use-activity-draft.ts`: los 16 campos editables del borrador viven en un solo estado, con setters estables que tienen el mismo contrato que los de `useState`, y el objeto `draft` que consume la persistencia. `use-generation-request.ts`: método (a mano o con Foxy), idea, opciones y carga de fuentes de la biblioteca. `use-authoring-operation.ts`: una operación por vez con `busy` y `error`.
- Resultado: `ActivityAuthoring.tsx` pasa de 35 a 10 `useState` y de 911 a 843 líneas; la línea base de tamaño bajó. La primera versión de `use-activity-draft` tenía 16 `useState` y la regla de F9 la rechazó.
- Comprobación: `tsc` sin errores; `lint:boundaries` pasa; las 15 pruebas de autoría de la ruta `fast` dan 129/129; `test:complete --group fast` 3231/3231. Navegador: pendiente para el cierre de F3.

### Corte 9 · `Activities` separa listado, contadores y editor (F3)

- `use-activity-list.ts`: `useActivityList` (listado y carga) y `useDeliveryCounts` (primeras entregas por actividad, sólo para el docente). `use-activity-editor-state.ts`: con qué se abre el editor (borrador, contexto curricular, paso y pedido a Foxy). `Activities.tsx` pasa de 23 a 10 `useState` y de 817 a 810 líneas; sus `set-state-in-effect` suprimidos bajan de 6 a 3 (68 en total).
- Los setters que vienen del hook entraron en las dependencias de sus efectos (son estables, así que nada se dispara de más). Eso destapó una diferencia del simulador de hooks de las pruebas: creaba un setter nuevo en cada render y React no. `agenda-ui-helpers`, `wizard-reference/component-harness` y `foxy-session-transition` ahora devuelven setters estables, como React.
- Comprobación: `tsc` sin errores; `lint:boundaries` pasa; las 27 pruebas de actividades de la ruta `fast` dan 274/274; `test:complete --group fast` 3231/3231.

### Corte 10 · `foxy-workspace` separa paneles, herramienta y arranque (F3)

- `use-workspace-panels.ts`: paneles y diálogos laterales (contexto, biblioteca, alcance, fuentes, renombrar). `use-tool-dialog.ts`: el diálogo de herramientas. `use-conversation-start.ts`: el primer mensaje que espera a que exista su conversación. Paneles y herramienta se usan como objeto (`panels.*`, `toolState.*`) porque desestructurados el archivo crecía de líneas y la regla de F9 no lo deja crecer.
- `foxy-workspace.tsx` pasa de 24 a 9 `useState` y de 953 a 935 líneas.
- Comprobación: `tsc` sin errores; `lint:boundaries` pasa; las 18 pruebas de Foxy de la ruta `fast` dan 183/183; `test:complete --group fast` 3231/3231; `web:build` exit 0.

### Navegador · cortes 2 a 10

- Entornos descartables de `documentation-preview.mjs` (corridas `documentation-preview-cf2620a5eed25841` y `documentation-preview-cd249d07cb8c6f87`), con IA sintética y la cuenta docente sintética de cada fixture. Las credenciales no se copiaron; los dos entornos se bajaron con su stopFile.
- Cortes 2–6: en Ajustes del aula se guardó dos veces seguidas (renombrar y restaurar). Los dos `PATCH .../settings` dieron 200 con un solo `GET /auth/csrf`. En Agenda, `/agenda?create=1` abrió el editor; el evento se creó (`PUT` 201) y apareció en el calendario.
- Cortes 8–10: en Actividades carga el listado y se piden los contadores (`/progress` 200). «Crear actividad» abre el editor; tema, tipo y método se marcan y aparece «Cambios sin guardar». «Con ayuda de Foxy → Ajustes y fuentes» abre el diálogo y pide las fuentes (`/activity-generations/sources` 200). En modo manual, el título y «Guardar borrador» abren la ficha del borrador privado con su tema. En Foxy AI, la herramienta «Planificar una clase» abre y cierra en línea, el selector de contexto abre y «Abrir biblioteca» muestra la biblioteca de contexto. Sin errores en la consola.

### Corte 11 · fuente CSRF inyectada en Foxy, Estudio, Archivos y adjuntos (F5, segunda parte)

- Decisión del usuario (2026-11-27): inyectar la fuente desde la composición. `src/core/contracts/csrf.ts` define el contrato `CsrfTokenSource` y el evento `sessionChangedEvent`. `createSessionCsrfSource` (shared) lee `/api/v1/auth/csrf` y conserva el código de error de la API.
- `createWebFoxyClient`, `createStudyClient`, `studyUploadRequest` y `createFileClient` aceptan la fuente como parámetro opcional; si no la reciben, se comportan como antes. La composición se la pasa: el workspace y el catálogo de Foxy, el panel de archivos privados, `study-csrf.ts` (una fuente para Estudio) y `chat-attachments`.
- Riesgo que se cubrió, y que también afectaba a aulas y agenda: la app navega sin recargar después del login. Por eso `account-client.mutate` emite `sessionChangedEvent` después de cada mutación de cuenta exitosa, y todas las fuentes descartan su token. La API sólo rota la sesión en esas acciones (`runtime.ts`). Un cambio de contraseña en otra pestaña deja un token viejo en esta: la primera mutación muestra «La sesión cambió» y la siguiente lee uno nuevo.
- La regla de F9 frenó dos archivos que crecían una línea por el import; se compensó con líneas en blanco sobrantes.
- Pruebas: 4 casos nuevos en `tests/web-http-shared.test.mjs` (11 en total): cambio de sesión, evento emitido por la cuenta, error de la fuente de sesión y reutilización e invalidación con mutaciones reales de Foxy, Estudio y Archivos. Las 26 pruebas de los clientes tocados de la ruta `fast` dan 169/169.
- Comprobación: `tsc` sin errores; `lint:boundaries` pasa; `api:build` y `web:build` exit 0; `test:complete --group fast` 3239/3239; `docs:check` 0 problemas.
- Navegador (corrida `documentation-preview-066e2ede615d6b65`, IA sintética, cuenta docente sintética): en Foxy AI, crear la conversación (`POST` 201) y dos turnos (`POST` 202) usaron un único `GET /auth/csrf`, con Foxy respondiendo y sin errores en la consola. El caso de cerrar sesión y volver a entrar sin recargar está cubierto por pruebas, no se recorrió en el navegador.

## Integración

- 2026-11-27: el usuario autorizó en esta sesión push y PR, sin merge. La rama se rebasó sobre `origin/main` (`490105ff`, cortes 1 y 2 de F1). No hubo conflictos: ningún corte de esta rama toca `application/server/`.
- Después del rebase: `tsc` sin errores; `lint:boundaries` pasa; `docs:check` 0 problemas (248 archivos); `web:build` exit 0; `test:complete --group fast` 3235/3235. No se corrieron `owned-db`, `owned-browser` ni `wrappers`.
- Tablero validado con `taskboard.py check`: 8 tareas. TASK-006 (F5) quedó completa con el corte 11 y TASK-008 (F8) queda diferida.

## Pendiente

1. F8: plazo de subida en la API, junto con el proxy de F1.
2. Sacar `application/server/` de la exclusión de la regla de tamaño cuando F1 esté integrado.
3. Bajar los 68 `set-state-in-effect` suprimidos y la línea base de tamaño; retirar de `useAgenda` las consultas `upcoming` y `afterDay`, que nunca se activan.
