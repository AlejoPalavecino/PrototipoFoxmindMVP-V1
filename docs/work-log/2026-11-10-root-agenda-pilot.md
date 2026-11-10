# Piloto de Agenda por responsabilidades

- Agente: `/root`, orquestador; identificador nativo de sesión no expuesto.
- Fecha: 2026-11-10. Rama: `codex/architecture-foundation`.
- Commit inicial: `ca68a31c7fcfde29f9566e920108abef48aeeaa1`; árbol limpio al retomar.
- Autorización: plan de migración aprobado y pedido vigente «vamos con la siguiente»: ejecutar TASK-004, con pruebas y verificación. La autorización Git anterior cubría sólo el primer corte; no se crean commits/push/merge/deploy en este piloto sin ampliación explícita.
- Fuentes: [diseño](../engineering/architecture-migration.md), [tablero único](../../odd/tasks/architecture-migration.md), [reglas de Agenda](../engineering/agenda/README.md).

## Resultado y límites

Reunir Agenda por responsabilidades, conservando contratos HTTP/UI, reglas, permisos, revisiones, errores, recurrencia/excepciones y transacciones. No migraciones SQL, datos retenidos ni proveedores reales. Estado inicial: TASK-004 READY, etapas posteriores PLANNED, Docker 29.9.2 disponible.

## Superficies y coordinación

- Coordinador: reglas compartidas, bootstrap/integración, contrato académico público, guard, CI/inventario, documentación y tablero. Único escritor del tablero.
- Backend delegado: módulo Agenda y compatibilidad legacy; prueba del contrato inyectado. No tocar web, dominio compartido o composición raíz.
- Frontend delegado: feature Agenda, pantalla, clientes/proxy/contexto de navegación y compatibilidad UI; pruebas focales propias. No tocar API, dominio compartido, guard o CI.
- Verificación independiente por riesgo de autorización/concurrencia sobre candidato identificado, después de reconciliar escritores. No se afirma aislamiento efectivo entre agentes del mismo workspace.

## Evidencia y recuperación

Inicio de ejecución: ejecutar base focal, obtener RED de contratos nuevos y migrar sin duplicar lógica. Guardar logs propios en `.test-artifacts/agenda-pilot/`, ignorados. Fallos y límites se conservan aquí; implementación no equivale a DONE.

- Base `ca68a31`: build API PASS y 79 pruebas focales Agenda/HTTP/proxy/DB/identidad/recurrencia/Estudio PASS. Log `baseline-contracts.log`; no se modificó código durante esa base.
- TASK-009: nueva entrada scoped falló RED por ruta ausente; siete archivos neutrales agrupados con reexports planos. 13 pruebas de compatibilidad/reglas/zonas PASS; guard conserva 123 excepciones, sin ciclos nuevos. Logs `domain-red.log`, `domain-green.log`. TASK-009 DONE; se habilitan los escritores disjuntos TASK-010/011.

## Integración del candidato

- Backend delegado `/root/agenda_backend` (chuli_worker), evidencia atribuida en [registro propio](2026-11-10-agenda-backend.md): 4 pruebas nuevas RED por ruta ausente -> 4 PASS; comparación mecánica 7/7 con SQL idéntico. Fábrica académica obligatoria sin imports de Aulas en infraestructura.
- Frontend delegado `/root/agenda_frontend` (chuli_worker), [registro propio](2026-11-10-agenda-frontend.md): 84 PASS focales; compatibilidad 2 PASS; tipos focales 0 diagnósticos. 15 pruebas históricas cambian sólo rutas/mocks, no aserciones. JSX/CSS preservados y ciclos reales eliminados.
- Coordinador conecta bootstrap de composición/transporte, aplicación raíz y contrato público académico. Página/proxy/consumidor global usan composición nueva. Catálogo de zonas neutral en shared. Pruebas nuevas incluidas en CI pure e inventario/ruta fast: 516 archivos, 53 exclusiones explícitas, 23 rutas; sin excluir pruebas nuevas.
- Primera selección integrada con preload estricto: 85 PASS/0 FAIL/0 SKIP, incluidos Agenda/HTTP/proxy/UI/DB/identidad/recurrencia/Estudio. Log `integration.log`.
- Build API/web PASS. Lint/AST PASS, 112 excepciones (11 retiradas: 3 backend + 8 aristas de ciclos UI); guard focal 18 PASS. Docs check inicial 90 archivos/888 links sin issues.

### Fallos conservados y correcciones

1. Primera fast: 1166 PASS, 1 FAIL (identidad de errores en nuevo domain-barrel), resto no ejecutado. `tsc` no incluía el antiguo `agenda.ts` al salir del cierre de imports API y el preload encontraba JS obsoleto. Se añadió `../../src/core/domain/**/*.ts` al include, con flags estrictos intactos. Build nuevo PASS, identidad bajo preload 2 PASS. No se debilitó la aserción.
2. Segunda fast detectó la expectativa exacta antigua de include en `api-build-pipeline.test.mjs`. Se añadió la nueva ruta esperada manteniendo flags/comandos/deadlines. Focal 12 PASS; `fast-final.log` conserva fallo y archivos no ejecutados. La corrida final completa pasó; ver cierre.
3. Revisor independiente detectó P2: el mapa de puentes aceptaba nombres nuevos dentro del mismo par de rutas. Se congelaron también bindings y modo, añadiendo negativos para helper/alias/type. Guard 18 PASS y repro independiente rechazado tras corrección.

### Revisión independiente atribuida

`/root/review_agenda_pilot` (quality_reviewer), sin escritura versionada: 71 pruebas PASS (53 focales + 18 guard), equivalencia mecánica de 7 backend/7 dominio, SQL/locks/reautenticación intactos, fábrica académica con el mismo tx/actor. Cierre estático navegador de 64 archivos sin node:/servidor/proxy; tipos focales 0 diagnósticos. Sin hallazgos pendientes tras endurecer puentes. Huella intermedia de 151 archivos: c35d8627a0092d689c97b6986aecff627d3cc56e5ba9bcd60417b7bbffdfb235; no representa correcciones posteriores de include/docs. Revisión adicional del include: 63/63 archivos de dominio incluidos y emitidos, incremental desactivado, `agenda.js` vigente y domain-barrel con preload 2 PASS; VERIFIED acotado. DB/build/browser se reconcilian por el coordinador, no se atribuyen al revisor.

### Navegador real y límites

Ego Lite, espacio propio 2, fixture sintética con componentes/CSS reales y API en memoria. Escritorio efectivo 1536×706 sin overflow horizontal; responsive en iframe same-origin de 390×844, dimensiones internas leídas y sin overflow. Capturas desktop.png/mobile.png inspeccionadas. No representa un dispositivo físico ni acredita persistencia con capturas.

Observados: creación y fila visible (put), edición y título actualizado (replace), borrado (remove y botón de evento ausente), título vacío con aria-invalid y foco en title, Escape restaura foco al disparador, conflicto muestra aviso y conserva borrador, error de servicio muestra dos acciones de reintento. El click de reintento no quedó verificado por referencia desconectada; cobertura automatizada de reintento sí pasa. Esperas fallidas por asumir status de borrado/detalle tras guardar se corrigieron observando estado real; no son fallos de producto introducidos. No se modificó UX por esas diferencias de automatización.

El armado inicial con symlink Python falló por privilegios Windows; se usaron junctions Node propios. Navegación inicial falló durante reinicio Next tras configurar fixture y se retomó el mismo espacio. Espacio finalizado exactamente una vez; servidor propio detenido por su sesión, sin tocar app local/Docker ajeno. Recibo `browser-receipt.json` y scripts ego-01 a ego-17 en artefactos ignorados.

- Repetición DB sobre build corregido: 19 PASS/0 FAIL/0 SKIP; incluye PostgreSQL Agenda, identidad, cola académica, recurrencia, regresiones y Estudio; `db-final.log`. Primera consulta mensual 331 ms bajo presupuesto vigente de 6000 ms.

- Validador TTP detectó transición prematura de TASK-012 mientras sus dependencias seguían VERIFYING. Se reconciliaron las evidencias verificadas de TASK-010/011 y se marcaron DONE antes de continuar TASK-012; no es un cambio de dependencias.

## Cierre verificado localmente

- `node scripts/run-complete-suite.mjs --group fast`: exit0, **1785 PASS/0 FAIL/0 SKIP**, 322/322 archivos reconciliados contra ruta fast. `fast-verified.log`, `fast-reconciled.json`; no inferido sólo del total del runner.
- `node scripts/build-api.mjs`: PASS, generación Prisma + compilación estricta; `npm run web:build`: PASS. `tsc -p apps/web/tsconfig.json --noEmit` y `tsc -p apps/classrooms-ui/tsconfig.json --noEmit`: exit0.
- `npm run lint:boundaries`: PASS, guard AST 112 excepciones; tests guard18 PASS. `node scripts/run-complete-suite.mjs --check`: inventario516, exclusiones53, rutas23, PASS. `npm run docs:check`, validador TTP y diff-check finales registrados al cerrar.
- Un fallo de codificación al editar docs con Python cp1252 se corrigió usando UTF-8 explícito; se normalizó CR duplicado del único Markdown afectado. No cambios de código funcional por esa corrección.
- Recursos descartables Agenda: cero contenedores con etiqueta propia observados tras las suites; fixture UI detenida. No se accedió a secretos, proveedores reales o datos retenidos.
- TASK-004/009/010/011/012 DONE. El candidato conserva contratos/producto/UX/SQL; no agrega proveedores, esquema o despliegues. Backend usa Adapter/Factory de composición y Facade pública donde resuelven acoplamiento real; no jerarquías GoF vacías.
- Entrega: cambios locales sobre ca68a31 en `codex/architecture-foundation`, sin commits nuevos, push, PR, merge o deploy. El corte es grande por traslado de implementaciones; compatibilidad y pruebas se conservan juntas. Si se autoriza Git, separar dominio/emisión, backend/composición, feature/adaptadores y guard/CI/documentación, cuidando dependencias; no presentar miles de líneas movidas como código nuevo.
- Límites: no se repitieron todos los grupos owned-db/owned-services/owned-browser/wrappers; se ejecutó PostgreSQL focal de Agenda/Estudio y fast completo. No QA de dispositivo físico, proveedor real, cuenta real ni despliegue. Reintento de error cubierto por automatización, su click en Ego no quedó verificado. No se declara suite completa global.
- Primer paso siguiente: desglosar TASK-005 por identidad/composición global y verificar consumidores antes de mover; no iniciar todos los módulos restantes en paralelo. Diseño/ejecución general autorizados, estados restantes PLANNED.

Cierre final: lint exit0 (112 excepciones), docs:check exit0 (90 archivos/894 links/0 issues), TTP exit0 (12 tareas válidas), git diff --check exit0. HEAD permanece ca68a31c7fcfde29f9566e920108abef48aeeaa1.

## Autorización y cierre Git del piloto

El usuario autorizó en el pedido vigente los commits necesarios de Agenda y avanzar con identidad/composición global frontend. Se crean cortes locales de dominio/emisión, backend/composición, feature/adaptadores y cierre documental. Sin push, PR, merge ni deploy. Pruebas del candidato cerradas en el recibo anterior; validación de índice/diff y controles finales antes de confirmar.

Commits locales observados: `e6d8349` dominio/emisión; `febe948` backend/composición; `1089678` feature/adaptadores. Los cortes backend/UI exceden 400 líneas por movimientos mecánicos y puentes asociados; dividirlos por tipo rompería su aplicación/rollback coherente. Guard, inventario y registros asociados permanecen con su unidad. Este recibo/documentación se cierra en un cuarto commit. Checks de continuidad antes de cerrar: AST112 PASS, inventario516 PASS, docs90/894/0 PASS; se conserva la evidencia funcional del candidato sin cambios de código desde su verificación.
