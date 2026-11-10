# TASK-017 · Capacidades académicas, Inicio y avisos

- Agente: `/root/academic_frontend_features`, escritor delegado; fecha: 2026-11-10.
- Rama: `codex/architecture-foundation`; base: `29fda643efdd19e24bf2a05cd26eff0994bea51a`; worktree compartido.
- Autorización: TASK-017, migración por responsabilidades sin cambios funcionales; sin publicación, commits, proveedores, datos retenidos ni escrituras al tablero/guard/CI.
- Fuentes: diseño `docs/engineering/architecture-migration.md`, TASK-017 del tablero y registro raíz de cierre.
- Estado: candidato local congelado para integración/verificación del coordinador. No declara DONE ni aceptación integral.

## Resultado y superficies

| Capacidad | Implementación y contrato |
| --- | --- |
| classrooms | Colección, filtros, portada, cabecera, navegación de aula, pertenencia, roster y configuración en `apps/web/src/features/classrooms`; contratos en `src/core/contracts/classrooms.ts`. |
| curriculum | Plan, selección/progreso temático, extracción y pasos de revisión del plan en `features/curriculum`; unidades en `contracts/curriculum.ts`. |
| materials | Biblioteca, lectura y predicado puro de preview en `features/materials`; `api.ts` público puro; contratos en `contracts/materials.ts`. |
| communication | Muro/formularios/hilos en `features/communication`; contratos en `contracts/communication.ts`. |
| activity-authoring | Autoría, rúbrica, generación y borradores locales en `features/activity-authoring`; contratos en `contracts/activities.ts`. |
| participation | Respuestas, borradores de cuestionario, editores práctico/cuestionario, apertura e intención explícita en `features/participation`; contratos en `contracts/participation.ts`. |
| grading | Editor/correcciones, resultados publicados, rúbrica, progreso/ficha del alumno en `features/grading`; contratos en `contracts/grading.ts`. |
| home | Proyección, composición interna y presentación Inicio en `features/home`; contrato/errores cliente y entrada pura `api.ts` propios. |
| notifications | Lista/centro, lectura por páginas y recordatorios existentes en `features/notifications`; contratos en `contracts/notifications.ts`. |

Todas las features tienen `index.ts` con exports nombrados; no importan otra feature, application, screens ni classrooms-ui. Los puertos `ClassroomClient` y `ApiError` viven en `src/core/contracts/academic-client.ts`, sin fetch/framework. `ClassroomCreationContext` está en `contracts/academic-context.ts`.

`application/academic-*` conserva los coordinadores heterogéneos: Classrooms, ClassroomView, Activities, AttemptHistory/Session, Wizard, fichas/preview de actividad, destinos y hooks de navegación. `academic-plan.tsx` y `academic-plan-workspace.tsx` conectan las etiquetas de autoría y preview de materiales por props tipadas: Plan no importa esas features. Transporte único en `application/academic-client.ts`; clientes autenticados y proxies servidor separados. `screens/{classrooms,home,notifications}-screen.tsx` compone sesión y rutas; las páginas existentes apuntan a screens.

Autorización ampliada del coordinador: nuevos `apps/shared-ui/academic-cover.tsx` (Cover, catálogo/opciones, iniciales, WizardCover) y `academic-date.ts` (fechas puras), contratos neutrales nuevos y remapeos de seis fixtures TSX académicas más `tests/helpers/wizard-reference/component-harness.mjs`. No se modificaron harness raíz de fixtures, auth ni Agenda.

Los archivos anteriores de classrooms-ui y lib/components académicos quedan como puentes explícitos temporales, con una sola implementación. CSS module se movió íntegro a `application/academic-classrooms-surface.module.css`; el CSS global `apps/classrooms-ui/styles.css` permanece para el retiro coordinado del host. El mapa exacto está en `.test-artifacts/architecture-finish/academic-map.json` (`files`, `symbols`; `implementations` distingue los dos adaptadores del Plan).

## Evidencia observada

- RED: `node --test tests/academic-features.test.mjs`: 0 PASS, 3 FAIL por falta de entradas, features y composición.
- GREEN: el mismo comando: 3 PASS, 0 FAIL; protege nueve capacidades, imports y entradas de pantalla/proxy.
- `npx tsc -p apps/web/tsconfig.json --pretty false`: PASS. `npx tsc -p apps/classrooms-ui/tsconfig.json --pretty false`: PASS después de corregirse un import concurrente de core por el coordinador.
- ESLint focal de las nueve features, application/academic-*, screens y proxies académicos, shared academic-cover/date: PASS. Primer intento incluyendo `src/core/contracts` abortó porque la config aún no cubría esa carpeta; se informó al coordinador, dueño de esa configuración.
- Selección final: `node .test-artifacts/architecture-finish/academic-run.mjs` (node:test, concurrencia 1; 62 archivos académicos sin imports de DB/backend): **243 PASS, 0 FAIL**, 50,56 s. Lista de remapeos en `academic-tests.json`; salida íntegra en `academic-focal.log`, en esa misma carpeta de artefactos.
- Corrida previa de esa selección con concurrencia 2: 242 PASS, 1 FAIL por `fetch failed / ECONNRESET` en prueba de rechazo HTTP. El archivo aislado `node --test tests/p5-web-proxy.test.mjs` pasó 6/6; la corrida final serial pasó completa. No se cambió su aceptación.
- Equivalencia AST/texto en `academic-equivalence.json`: 126 de 128 cuerpos runtime/CSS idénticos, normalizando sólo CRLF. Plan y PlanWorkspace difieren exclusivamente por los puertos de presentación y su reenvío; las funciones helpers y su markup permanecen. Los **1.283 llamados assert** de 71 archivos de tests remapeados son idénticos normalizando CRLF. Fuente y destino de cada símbolo conservados en el recibo.
- Los remapeos ajustaron rutas de lectura/import y claves de mocks, incluido el mock de Wizard que ahora recibe el barrel público de curriculum y WizardCover compartido. No se cambiaron asserts para obtener verde.

## Fallos, omisiones y límite de autorización

Una edición mecánica inicial de Python leyó con cp1252 por defecto; se detectó mojibake y se repararon ocho archivos con UTF-8 explícito. La comparación final de cuerpos y aserciones acredita que no quedaron cambios de texto por esa causa.

La selección amplia inicial incluyó por error `activity-unknown-start.test.mjs`, cuyo helper `withAiDatabase` ejecuta Docker indirectamente. Esto excedió el límite de este encargo de no ejecutar Docker. La primera corrida terminó con fallos y el helper tiene limpieza `finally` de recursos PostgreSQL efímeros propios en tmpfs; otra corrida amplia se interrumpió al advertir la selección incorrecta. Se informó al coordinador; no se operó Docker adicionalmente para inspeccionar o limpiar fuera del alcance. No se usaron volúmenes retenidos ni proveedores reales según el contrato inspeccionado del helper. La evidencia válida de frontend es la selección final sin DB. La comprobación de recursos residuales, si corresponde, queda con el coordinador autorizado.

Sin build global, navegador/QA visual nuevo, integración con DB ni cobertura de proveedores en el candidato final. Los tests de componentes/cliente/proxy y la equivalencia no sustituyen la aceptación integrada ni una comprobación visual.

## Siguiente paso y reversión

Coordinador: incorporar guard/CI/config de lint para contratos y api.ts públicos; remapear consumidores fuera de este encargo y retirar puentes tras reconciliar evidencia. `tests/helpers/home-reference/harness.mjs` requiere la junction `apps/web/src` para su fixture nueva; el coordinador fue avisado y conserva esa escritura. Foxy/Estudio recibió los nuevos exports shared y mapa académico; no se editaron sus archivos.

Reversión de esta unidad: retirar los destinos de las nueve features, application/screens/proxies académicos y nuevos contratos/shared indicados por el mapa; restaurar exclusivamente los orígenes académicos y sus rutas/mocks desde la base indicada. Reconciliar antes el consumo posterior de otros escritores. No restaurar árbol completo, no tocar datos y no revertir cambios ajenos. No se generó commit propio.
