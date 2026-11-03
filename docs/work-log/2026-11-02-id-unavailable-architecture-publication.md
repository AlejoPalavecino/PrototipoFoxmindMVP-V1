# Consolidación y salida de aulas archivadas — integración y publicación

- Agent / role: /root, coordinación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main y codex/architecture-publication en un árbol de integración separado.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58; misma referencia remota inicial.
- Phase and detailed task/spec links: [Consolidación](../../odd/tasks/architecture-consolidation.md), [salida voluntaria](../../odd/tasks/archived-classroom-voluntary-leave.md).
- Status: completed para la integración y verificación del candidato. La referencia remota se comprueba después del push.

## Request and scope

Revisar pendientes, separar commits, verificar y publicar ambas entregas en main. Sin despliegue.

## Work performed

Reconciliados los cambios del checkout original. Se separaron los cambios entre entregas con una lista explícita de nuevas rutas. Se preservaron fuera de la publicación el archivo generado de Next, documentación y registros de demo/arranque, y un archivo local no relacionado.

## Verification

La reconstrucción del candidato de consolidación coincide con SHA-256 `623ccae8e431e50f970108546b975c33ff9040efdb2972303a451c2c4009c4bb` del registro ARQ-09.

- `node scripts/run-complete-suite.mjs --group fast`: exit 0, 1450 PASS, 0 FAIL, 0 SKIP. Compilación Prisma/TypeScript incluida.
- `npm run web:build`: exit 0. Se restauraron los bytes previos del archivo generado por Next.
- `node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 tests/p5-enrollment.test.mjs tests/p7-practical.test.mjs tests/p8-publication.test.mjs`: 41 PASS. Concurrencia y rollback, autorización de archivos y publicación.
- `node --test tests/p8-publication-tp-integration.test.mjs`: 3 PASS y cero errores de limpieza. Chromium, archivo privado, publicación, salida de aula archivada, revocación, readmisión y reinicio de servicios propios.
- `node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 tests/activity-ai-host.test.mjs apps/api/src/foxy-ai/foxy-shared-admission.test.mjs apps/api/src/foxy-ai/foxy-visual-restart-profile.test.mjs apps/api/src/foxy-ai/foxy-real-storage-scanner.test.mjs tests/grading-ai-files-integration.test.mjs`: exit 0, 37 PASS, con proveedor sintético y recursos propios.
- `node --import ./.test-artifacts/arq09-p9-role-fixture.mjs --test --test-concurrency=1 --test-name-pattern 'ARQ-07|P9 first actual' tests/p7-authoring-integration.test.mjs tests/p9-service-recovery-integration.test.mjs`: exit 0, 2 PASS. Navegación y recuperación tras pausa de base, almacenamiento y escáner. P9 usa el mismo adaptador local de selección de rol de ARQ-09. Los avisos durante la pausa no impidieron recuperar los servicios. Limpieza sin errores.
- Verificación proporcional de los grupos integrados. No se ejecutaron todos los wrappers ni toda la matriz de navegador.
- `npm run lint:boundaries`, inventario 443/53/23, comprobaciones documentales y `git diff --check`: exit 0. Gitleaks en los dos commits de producto: cero hallazgos.
- Comparación de blobs Git tras filtros de atributos: los 147 paths cambiados de producto coinciden con el árbol que se probó.

## Commits and outcomes

- `47c0a56bf5d71eef87e2009098be80d1f98370ae` — consolidación. Agrupa el cambio transversal con el guard y su baseline, contratos y pruebas. Supera el presupuesto habitual de revisión. Los registros ARQ conservan las fronteras verificadas por etapa.
- `f7e558ac309e828093418673a700d744db7724d3` — salida voluntaria de aulas archivadas. Incluye permisos, interacción, criterios y regresión integrada.

## Handoff

La publicación autorizada es un avance de `refs/heads/main` sin forzar. Comprobar después que el SHA remoto sea el mismo que el candidato integrado. El despliegue está fuera de alcance.
