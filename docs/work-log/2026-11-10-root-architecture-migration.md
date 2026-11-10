# Migración de arquitectura: base y fronteras compartidas

- Agente: `/root`, orquestador. Identificador nativo de sesión no expuesto.
- Fecha: 2026-11-10. Rama: `main`; workspace del usuario.
- Commit inicial: `aebc603fb501230870c2b5cc7a4e5b2e5a08cc3e`; árbol limpio al comenzar.
- Autorización: el usuario aprobó el plan de seis etapas y autorizó comenzar la implementación incremental con pruebas. No concede publicación Git, despliegue ni cambios funcionales o de datos.
- Fuentes: [diseño y aceptación](../engineering/architecture-migration.md), [tablero único](../../odd/tasks/architecture-migration.md).

## Corte actual

Etapa 1 (mapa y base de pruebas) y primer corte de etapa 2 (límites, UI genérica y navegación global). Se conservan contratos HTTP, reglas, estilos y transacciones. El resto de la migración permanece pendiente en el tablero.

## Evidencia

Inspección inicial: `git status --short` sin cambios; rama y commit arriba. Revisados composición, runner transaccional de Aulas, unidad de trabajo de Agenda, integración Estudio/Agenda, compilación, guard AST, inventario y rutas de CI.

Base previa a cambios de código:

- `npm run lint:boundaries`: PASS, 123 excepciones congeladas.
- `node scripts/run-complete-suite.mjs --check`: PASS, 514 entradas, 53 exclusiones explícitas, 23 rutas.
- `npm run web:build`: PASS; build API y compilación security/mail ejecutados por prerrequisitos de la suite rápida: PASS.
- `npm run docs:check`: PASS, 87 archivos/874 enlaces, cero problemas.
- Suite rápida `node scripts/run-complete-suite.mjs --group fast`: FAIL, 35 PASS/2 FAIL; se detiene según diseño del runner. Fallos previos en `tests/pending-classrooms.test.mjs`: espera `Pendientes 1` pero observa `Pendientes1`; el escenario DELETE falla con `Unexpected token ','` en el loader TS de pruebas. No se modificaron producción ni pruebas al observarlos. El resto de ese grupo no fue ejecutado.
- Selección focal previa (guard/barrel/clientes cuenta-aula-Inicio/flows/Agenda UI/discovery): 60 PASS, cero fallos, usando preload API y transformación de tipos.
- Validador TTP inicial rechazó explicación agregada al campo Approval; corregido al valor literal `approved` y explicación en párrafo separado.
- Logs privados ignorados: `.test-artifacts/architecture-migration/baseline-{fast,web-build,targeted}.log`. No contienen credenciales ni datos reales.

Esta base caracteriza fallos anteriores; no acredita una suite general verde. El corte compartido puede verificarse independientemente sin modificar esos comportamientos. Reejecutar los dos fallos al finalizar para identificar regresiones adicionales.

## Estado y recuperación

Primer corte local: TASK-001 (caracterización), TASK-002 y TASK-003 verificadas con los límites indicados. Etapas 3–6 pendientes; siguiente TASK-004, piloto Agenda. El cierre inicial fue sin commits; el cierre DB/Git autorizado posteriormente se registra al final. Sin push, integración publicada ni despliegue.

## TASK-002: guard y UI compartida

- Nuevos límites probados RED antes de implementar en `tests/audit-boundaries-guard.test.mjs`; extracción de UI probada en `tests/agenda-event-form-view.test.mjs`. RED también incluye la navegación aún pendiente. Una ruta relativa incorrecta en la nueva fixture de módulos se corrigió antes de GREEN; no se alteraron aserciones funcionales existentes.
- Guard nuevo en `scripts/migration-boundaries.mjs`, usado por el parser AST existente. Protege capas/módulos migrados, shared y features; conserva excepciones exactas del código legado. No declara migrados módulos todavía planos.
- `Notice`/`Dialog` se trasladan con el mismo marcado a `apps/shared-ui/feedback.tsx`. Consumidores Agenda/Foxy/Estudio/web actualizados. El puente en `classrooms-ui/components.tsx` conserva consumidores de Aulas sin duplicar implementación ni mover estilos.
- Pruebas guard + Agenda form/UI/view-modes: 32 PASS, cero fallos (`verified-shared.log`). Lint: PASS, 123 excepciones previas. `git diff --check`: PASS (avisos de normalización CRLF, sin errores).
- Ego Lite: espacio propio 1, cerrado con `finish({keep:[]})`. Fixture Next propia derivada de `tests/helpers/agenda-polish`, API en memoria y componentes/CSS actuales, sin DB/cuentas/proveedor reales. Abrir diálogo, Escape, cierre explícito y restauración de foco: PASS. Enviar vacío con Enter muestra alert y enfoca título: PASS. Capturas inspeccionables privadas `dialog-desktop.png`, `dialog-error.png`.
- Límites de QA: viewport efectivo 1536x706; emulación CDP solicitada no se conservó, por lo que no se acredita mobile/tablet. Intentos con selector submit inexistente y raíz de snapshot inválida se corrigieron tras observar DOM. El botón inferior quedó fuera del área visible en la fixture y el clic no se completó; el envío de validación se probó por teclado. No se atribuye a esta extracción una validación responsive integral ni persistencia de eventos.
- Rollback del corte: guard+pruebas nuevas y extracción/imports de feedback; no afecta esquema, reglas, archivos ni servicios retenidos. No revertir otros cambios del workspace.

## TASK-003: navegación global y verificación final

- Navegación trasladada a `apps/web/src/application/navigation/destinations.ts`, sin ampliar allowlist, cambiar serialización ni destinos. `classroom-client.ts` reexporta las mismas funciones con nombres anteriores; pruebas comprueban identidad y conservan los escenarios de seguridad existentes. Consumidores globales importan el nuevo dueño.
- Build falló al introducir el nombre previsto `src/app`: Next informa que `pages` y `app` deben estar bajo la misma carpeta. Se renombró a `src/application`, conservando Pages Router y URLs; el build posterior pasa. Ajustados guard, consumidores, pruebas y diseño. No se cambió stack o flujo UX.
- La revisión independiente encontró aceptación de `typeof import(public)` sin qualifier. Se añadió RED y se corrigió la regla de contratos nombrados. También se protege la entrada pública `features/<nombre>/index.ts` desde pantallas/composición. RED/GREEN en `red-public-contracts.log`/`green-public-contracts.log`.
- Tipos finales: `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false` y `-p apps/classrooms-ui/tsconfig.json --noEmit`: PASS. `npm run web:build`: PASS (`final-web-build.log`).
- Selección focal con preload `scripts/register-api-test-build.mjs`, `--experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1`: guard, barrel, p3/p5/p9 clientes, foxmind-3d-flows, Agenda form/UI/view-modes y discovery: 67 PASS/0 FAIL (`final-targeted.log`). Guard final con nuevas aserciones: 17 PASS/0 FAIL (`green-public-contracts.log`). No sumar conteos solapados.
- Componentes web colocados (lista de `rg --files apps/web/src/components` filtrada por `.test.mjs`), `tests/ux-chat-polish.test.mjs` y `tests/brujula-foxy-handoff-ui.test.mjs` con el mismo preload/flags: 84 PASS/0 FAIL (`final-components.log`).
- Reejecución de `tests/pending-classrooms.test.mjs`: conserva los dos fallos previos (4 PASS/2 FAIL), sin nuevas fallas (`final-known-failures.log`). No se editaron sus aserciones ni código de ese comportamiento.
- Verificación ampliada `node scripts/run-ci-suite.mjs --suite pure`: 89 PASS/1 FAIL en recurrencia con DB (`Agenda database cleanup inspection unavailable`); resto no ejecutado por política del runner. `docker info --format '{{.ServerVersion}}'` confirma ausencia del pipe `dockerDesktopLinuxEngine`. La etiqueta pure incluye un escenario DB; no se atribuye este fallo a la extracción ni se declara integración verificada. No se arrancó Docker ni se tocaron contenedores retenidos.
- Inventario final: 514 entradas/53 exclusiones/23 rutas, sin retirar cobertura. No se agregaron archivos test nuevos fuera de ese inventario.
- Preview Next propio detenido mediante la sesión exec que lo creó; espacio Ego cerrado. No permanecen servidores de QA de este corte.

## Revisión independiente atribuida

`/root/review_architecture_cut` (quality_reviewer), solo lectura, revisó código/pruebas contra `aebc603`. Informó VERIFIED sin hallazgos pendientes: guard 17/17, selección focal final 39/39, guard del repo con 123 excepciones y diff check PASS; comparación literal de navegación (salvo nombres) y Dialog/Notice iguales a HEAD. Hash conjunto informado del candidato de 25 archivos de código/pruebas: `2bc760cf92936961cd6ad6fd6e99cffcd9fcc3855aa43ab8a38731c4ffaa7848`. No sustituye los resultados del coordinador ni acredita build, DB, navegador o responsive por sí mismo. No afirmó aislamiento efectivo ni escribió archivos.

## Entrega y siguiente corte

El diff incluye tres unidades revisables: base/diseño/seguimiento; guard y feedback; navegación con su compatibilidad y regresiones. El total supera unas 400 líneas al sumar documentación y código trasladado; no se comprimió producción ni se suprimieron pruebas para reducirlo. No se crearon commits sin autorización.

Para TASK-004: mapear archivos de Agenda a feature/módulo por responsabilidades, definir el contrato académico acotado y actualizar consumidores/CI con pruebas de paridad. Antes de acreditar DB/HTTP persistente, disponer de Docker y ejecutar fixtures propias. Preservar locks y transacción Estudio/Agenda; no trasladar reglas ni cambiar datos como atajo. La autorización de implementación por etapas sigue vigente; no requiere reconfirmación para continuar el alcance aprobado.

Validación final de continuidad: `docs:check` PASS (87 archivos/882 enlaces), validador TTP PASS (7 tareas), inventario/rutas PASS (514/53/23) y `git diff --check` PASS. Engram rechazó guardar el resumen porque la sesión host no está registrada; no se reintentó ni se atribuye persistencia en memoria. La continuidad esencial está en este repositorio.

## Cierre con DB y commits autorizado

El usuario informó Docker iniciado y autorizó el 2026-11-10 ejecutar integración DB, realizar los commits de este primer corte y dejarlo cerrado para avanzar. Se mantiene fuera del alcance push, despliegue y uso/modificación de datos retenidos. `docker info` confirma engine 29.9.2. Candidato inicial de esta continuación: `aebc603`, con el mismo diff de migración pendiente descrito arriba; no se detectaron cambios ajenos adicionales. Se reabre solamente verificación y entrega, no se adelanta el piloto Agenda.

Verificaciones de DB y commits: en curso. Rama de entrega local `codex/architecture-foundation`, creada desde `main` para mantener el corte separado; no se hizo push ni merge.

- `closure-pure.log`: 179 PASS/0 FAIL. Incluye el escenario de recurrencia persistente antes bloqueado por Docker.
- Primer intento `--group owned-db`: 3 PASS/1 FAIL por deriva de Prisma en el prerrequisito de `pending-classrooms-database`; el resto no se ejecutó. Diagnóstico en fixture propia (deploy dos veces/status/diff): exit2, defaults de StudyFolder `now()` vs SQL `clock_timestamp()` y map del índice faltante. Se alinearon sólo las tres anotaciones Prisma con el SQL vigente; replay/diff posterior exit0 (`No difference detected`). Ningún SQL cambió y ninguna base retenida se accedió/modificó.
- Pendientes RED: dos fallos previos reproducidos. Se agregó espacio entre etiqueta/contador y se investigó el loader. La hipótesis inicial sobre decoradores no resolvió el fallo y se descartó. La causa comprobada fue omitir `fileName` al transpilar TS con JSX habilitado: una nueva prueba de genérico `.ts` falla RED (`T is not defined`) y pasa al proveer el nombre real. Opciones de decoradores quedaron intactas. Pendientes/discovery: 13 PASS, con las aserciones anteriores intactas.
- Primer fast ampliado tras resolver Pendientes: 716 PASS/1 FAIL por fixture explícita de migraciones desactualizada (46 vs 52 existentes). Revisor independiente comprobó las seis migraciones en HEAD y los 52 SQL idénticos normalizando sólo CRLF/LF. Aprobó actualizar exclusivamente la lista; no se tocaron aserciones ni hashes. Inventarios focales GREEN; fast completo repetido en ejecución.
- Revisor `/root/review_architecture_cut`: delta schema/loader/contador VERIFIED, sin hallazgos; 13/13 PASS y migración versionada intacta. Hash conjunto de cuatro archivos informado: `66f1c042a01b5e853dee53a6b4f58245943e1f2e5dd1d9998b40b9c12a85ac2a`. Revisión de fixture separada APTA antes de editar, sin atribuirle ejecución DB.
- Commit `1edf09c53745a91b77cbd4e7815a4e39b28778b6`: alineación declarativa de Prisma y guía de datos; no migración nueva.
- Commit `906b4e8dc039cc25220bee542f904c39b9f4e680`: correcciones de loader/contador/fixture con regresión genérica y guía de pruebas.
- Segundo fast ampliado: 1437 PASS/2 FAIL por expectativas ordinales D2 anteriores al escenario de avatar ya existente (17 vs 18). Revisión independiente APTA: conservar regex y los 18 escenarios, actualizar sólo ayuda y metadatos de cobertura exacta. La ayuda documenta el grupo discontinuo account (1, 9–13). Pruebas de opciones GREEN 3/3; repetición completa de fast en curso.
- Commit `5a22424645e87c9df8ccbb32051caf208c1b4a54`: metadatos de selección de identidad y prueba de cobertura exacta reconciliados; no altera patrones ni escenarios de cuenta.
- `npm test` sobre base propia: 38 PASS y smoke Prisma PASS (crear, relación tipada, bigint, rollback). `closure-db-targeted.log`: 17 PASS para DB/HTTP/permisos de Estudio, Agenda privada/académica/identidad/regresiones y locks concurrentes. No se usaron proveedores reales.
- `closure-web-build.log`: build web PASS. Tipos web/classrooms PASS. Suites ampliadas en curso (`closure-owned-db-green.log`, `closure-fast-verified.log`); no extrapolar estos resultados focales a los grupos aún en ejecución.
