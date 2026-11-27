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
