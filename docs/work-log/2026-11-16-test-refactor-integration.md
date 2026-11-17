# Reconciliación de pruebas backend + frontend

- Agente: `/root/frontend_regression_tests`, test_engineer; sesión independiente no expuesta.
- Fecha: 2026-11-16. Rama: `codex/refactor-integration`; HEAD inicial observado `d79ee909e094b5c7dbbbcccf1eb2bf972908e0c1`.
- Worktree exclusivo de esta tarea: `C:/Users/alejo/.codex/worktrees/refactor-integration/ProtipoFoxMind`. Los worktrees originales no se modifican.
- Candidatos asignados: backend `d79ee909`, frontend `eba381b3`, base común `dd6f4bc`.
- Fuente/alcance: registro root de integración y mapas de movimientos versionados. Sólo tests/** no protegidos, helpers de fixture, artefactos test-* y este registro. Sin producción, scripts, manifests, tablero, servicios, DB, proveedores ni browser. Sin commits por este agente.
- Aceptación: unión de imports backend/frontend conservando todas las aserciones. Nueva semántica o aceptación equivocada requiere revisión del coordinador.
- Estado inicial: conflictos en brujula-wizard-parity y home-order. Ejecutor cleanEnvironment todavía bloqueado por conflicto de ci-suites; API build aún no preparado. Se registrará sintaxis RED antes de conciliar; suite fast sólo tras GO del coordinador con prerequisites listos.

## RED y conciliación inicial

- `node --check tests/brujula-wizard-parity.test.mjs` y `node --check tests/home-order.test.mjs`: ambos fallaron con `SyntaxError: Unexpected token '<<'` en el marcador de conflicto (líneas 4 y 5). Es RED de sintaxis del candidato combinado; no acredita fallo funcional ni ejecución de tests.
- Resolución de brujula-wizard-parity: draftPayload desde classrooms/access/infrastructure/policy (backend) y WizardPlanText desde curriculum/plan (frontend).
- Resolución de home-order: cursor/sql-page/http/service desde home/dashboard (backend) y createWebHomeClient desde application/clients/home-client (frontend).
- Las mismas comprobaciones de sintaxis posteriores y `git diff --check` de ambos tests: exit 0. Cero aserciones modificadas.
- Escaneo en lectura de rutas completas antiguas de ambos mapas en tests/** no protegidos: sin referencias runtime remanentes identificadas. Los equivalentes compilados .js detectaron dos rutas retiradas intencionales de architecture-test-discovery: se conservan porque prueban el rechazo de artefactos obsoletos. No cubre rutas construidas dinámicamente.
- El coordinador confirmó dependencias locales, reconciliación de CI/manifests y API build exit 0, y autorizó la suite fast completa.

## Preparación y ejecución

- `node .test-artifacts/refactor-integration/test-fast.mjs tests/brujula-wizard-parity.test.mjs tests/home-order.test.mjs`: **10/10 PASS**, exit 0. Recibo preservado en test-fast-conflicts-green.json/.log.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-security.json`: exit 0.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json`: exit 0.
- Runner propio test-fast.mjs usa executeFastFile, cleanEnvironment y preload API existentes, máximo cuatro archivos. Selección completa desde la ruta fast aprobada de complete-suite-routes; continúa después de fallos y conserva JSON por archivo y TAP completo. No modifica los runners ni manifests productivos.
- `node .test-artifacts/refactor-integration/test-fast.mjs`: pasada completa en curso tras GO del coordinador. Recibos en `.test-artifacts/refactor-integration/test-fast-selected.json`, test-fast.json y test-fast.log.

## Hallazgos de la primera pasada

- RED: agenda-module 3 pass/1 fail por recorrido de agenda/application retirado. Se adaptó a los dueños events y academic-projection, leyendo todos sus .ts recursivamente y exigiendo fuentes no vacías. Conserva superficie pública, prohibición de SQL/barrel y controles de UOW, identidad y reautenticación. No es un fallo productivo.
- RED: domain-barrel 4 pass/1 fail por `readdir('../src/core/domain/index')`, directorio inexistente. Se corrigió sólo URL a `../src/core/domain/`; conserva expectativa de archivo plano único index.ts y ausencia de SQL, conforme a decisión humana de conservar esa entrada. No es un fallo productivo.
- RED: p4-integration-controls 4 pass/1 fail: espera Next 16.4.2 mientras package y lock contienen 16.4.5. Se solicitó revisión al coordinador antes de tocar ese pin de aceptación. El coordinador confirmó que 16.4.5 es el parche aprobado/documentado del candidato frontend y autorizó cambiar únicamente ese pin esperado y el título obsoleto. Se conserva exactitud de todos los pins y equivalencia package/lock; no se permiten rangos ni se omite el control.

## Resultado final y límites

- Pasada completa: `node .test-artifacts/refactor-integration/test-fast.mjs` → **474/474 archivos, 2876 pass/3 fail/0 skipped**, exit 1. Los tres fallos descritos arriba se conservaron en `test-fast-initial.json/.log`.
- Repetición afectada: `node .test-artifacts/refactor-integration/test-fast.mjs --failed` → **3/3 archivos, 14 pass/0 fail/0 skipped**, exit 0. Recibo `test-fast-rerun.json/.log`.
- Registro final por archivo: `.test-artifacts/refactor-integration/test-fast-final.json` → **474 archivos, 2879 pass/0 fail/0 skipped**, cada fila con sourceRun que identifica pasada completa o repetición. **Es evidencia reconciliada por archivo; no una segunda pasada completa.** El coordinador autorizó esta estrategia y no requirió duplicar los otros 471 archivos tras cambios exclusivos en los tres tests fallidos.
- `git diff --check` de los cinco tests modificados: exit 0. Los dos archivos inicialmente en conflicto ya no contienen marcadores; el coordinador conserva autoridad sobre staging/integración Git.
- Archivos editados por este agente: tests/brujula-wizard-parity.test.mjs, tests/home-order.test.mjs, tests/agenda-module.test.mjs, tests/domain-barrel.test.mjs, tests/p4-integration-controls.test.mjs, este registro y artefactos test-* ignorados. No se editaron nuevos frontend-* protegidos.
- Sin fallos pendientes del grupo fast. No se ejecutaron suites de DB/servicios/browser ni proveedores reales. No se acredita con estos resultados el build web, QA visual, pruebas de recursos externos o estado desplegado; son responsabilidades separadas del coordinador.
- Estado: superficies de tests liberadas para integración. Sin commits ni cambios de producción, scripts, manifests, tablero o worktrees originales por este agente.
