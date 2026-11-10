# TASK-011 — Agenda frontend

- Agente: `/root/agenda_frontend`, escritor frontend delegado; sesión no expuesta.
- Fecha: 2026-11-10. Rama: `codex/architecture-foundation`; base: `ca68a31c7fcfde29f9566e920108abef48aeeaa1`.
- Autorización: piloto aprobado y TASK-011 delegado por coordinador. Sin publicación, servicios reales ni cambios UX.
- Superficies: feature Agenda UI/model/api, composición pantalla/cliente/proxy/target, puentes legacy, consumidores Aulas autorizados y tests mecánicos.
- Estado inicial: implementación pendiente; trabajo concurrente del coordinador preservado.
- Verificación: RED entrada nueva antes de mover; GREEN focalizado después. Builds globales y QA integrado a cargo del coordinador.
- Reversión: retirar sólo feature y composición introducidas en este corte, restaurando archivos legacy y referencias de pruebas de TASK-011; conservar dominio/backend y trabajo ajeno.

## Resultado del corte

- UI en `apps/web/src/features/agenda/ui`, hooks/reglas de presentación en `model`, contrato/constructor de rutas en `api`, entrada pública con nombres explícitos en `index.ts`.
- `application/agenda-client.ts` conserva sesión/CSRF/fetch y errores; inyecta el caller en `createAgendaClient`. El transporte Node vive exclusivamente en `application/server/agenda-proxy.ts`.
- Pantalla de composición en `screens/agenda-screen.tsx`; parser de destino en `application/navigation/agenda-target.ts`.
- Los 34 archivos anteriores de `apps/agenda-ui` y las cuatro entradas web conservan puentes explícitos. El CSS legacy importa el CSS nuevo. El puente `event-draft.ts` conserva `eventFailure`, que ya no se reexporta desde el draft interno y por eso deja de formar un ciclo con validación.
- Props de campos extraídas a `ui/event-field-props.ts`; subcampos ya no dependen de `EventFields.tsx`. Catálogo neutral de zonas extraído a `apps/shared-ui/time-zones.ts`; Aulas lo usa directamente. `useAgendaTarget` consume el contrato público de la feature.
- El movimiento supera 400 líneas por trasladar implementaciones existentes y 531 líneas CSS sin comprimirlas. La feature contiene 1715 líneas contando CSS y las extracciones. La autoría nueva se concentra en puentes, constructor inyectable, tipo de props y pruebas de compatibilidad; no se sumaron reglas de producto.

## Evidencia observada

1. RED: `node --test tests/agenda-feature.test.mjs`: 0 PASS / 1 FAIL, `ENOENT` de `apps/web/src/features/agenda/index.ts` antes de mover.
2. Durante GREEN, una extracción parcial de props produjo error de sintaxis; se corrigió antes de la suite focal. Primera verificación de tipos detectó `EventDraft` faltante en `EventFields.tsx`; importación corregida y verificación repetida con 0 diagnósticos.
3. Suite focal: comando siguiente, 84 PASS / 0 FAIL / 0 SKIP, sin servicios reales:

```powershell
node --test tests/agenda-feature.test.mjs tests/agenda-client.test.mjs tests/agenda-proxy.test.mjs tests/agenda-event-color-model.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-model.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-polish-presentation.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-time.test.mjs tests/agenda-ui.test.mjs tests/agenda-view-modes.test.mjs tests/agenda-visual-polish.test.mjs tests/brujula-agenda-account-complete.test.mjs
```

4. Después de agregar prueba de identidad de los cuatro puentes de composición: `node --test tests/agenda-feature.test.mjs`: 2 PASS / 0 FAIL. Después de corregir importación de tipo: `node --test tests/agenda-visual-polish.test.mjs tests/agenda-feature.test.mjs`: 3 PASS / 0 FAIL (antes de agregar el segundo test de compatibilidad).
5. Programa TypeScript focal: 0 diagnósticos usando opciones reales del proyecto, sin emitir ni build global. Reproducción:

```powershell
@'
const ts = require('typescript');
const config = ts.readConfigFile('apps/web/tsconfig.json', ts.sys.readFile).config;
const options = ts.convertCompilerOptionsFromJson(config.compilerOptions, process.cwd() + '/apps/web').options;
options.incremental = false; options.plugins = [];
const roots = ['apps/web/next-env.d.ts', 'apps/web/src/features/agenda/index.ts', 'apps/web/src/screens/agenda-screen.tsx', 'apps/web/src/application/agenda-client.ts', 'apps/web/src/application/server/agenda-proxy.ts', 'apps/web/src/application/navigation/agenda-target.ts'];
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram(roots, options));
console.log('Focused TypeScript diagnostics:', diagnostics.length);
process.exitCode = diagnostics.length ? 1 : 0;
'@ | node
```

6. Comprobaciones in-memory con TypeScript/`git show HEAD`: los árboles JSX de los 15 componentes y de la pantalla coinciden; CSS coincide completo; ambos normalizan CRLF/LF del checkout. Un comparador exacto de sustituciones comprobó que los 15 tests existentes modificados sólo cambian ubicaciones de importación, sin cambiar aserciones. `rg` no encontró dependencias de application/lib/components/Aulas dentro de la feature. Transpilación de archivos de la feature: 0 diagnósticos sintácticos.

## Pendientes y límites del encargo

- Guard/mapa exacto de puentes, inventario/CI, pruebas globales, build y QA real del piloto: coordinador. No se atribuye verificación visual ni persistencia real a las pruebas unitarias de este corte.
- Consumidores fuera de alcance informados al coordinador: `apps/web/pages/agenda.tsx`, `apps/web/pages/api/v1/agenda/[[...path]].ts`, `apps/web/src/components/classrooms-screen.tsx`; conservan funcionamiento por shims hasta migración del coordinador.
- Sin commits, push, merge, deploy, lectura de secretos ni proveedor real. No se editaron backend, tablero TTP ni fuentes canónicas de documentación.
- Estado: implementado y verificado focalmente; aceptación integrada TASK-011/012 pendiente de reconciliación del coordinador.

## Ajuste focal posterior — superficie CSS pública

- Encargo adicional del coordinador: resolver screen → CSS privado de feature sin modificar guard ni UI.
- `features/agenda/index.ts` exporta `agendaSurface` nombrado desde el CSS existente; `screens/agenda-screen.tsx` lo importa como `surface` desde esa entrada. Conserva el acceso `surface.screen` y las clases existentes.
- Verificación repetida: programa TypeScript focal reproducible arriba, **0 diagnósticos**. `node --test tests/agenda-feature.test.mjs`: **2 PASS / 0 FAIL**.
- Sólo se modificaron esos dos archivos y este registro. Sin build, DB ni cambios de estilos/contenido.
