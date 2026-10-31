# Rol de cuenta en frontend — Implementación entregada

- Agent / role: frontend_roles / implementación
- Session or task ID: /root/frontend_roles
- Date: 2026-10-31
- Branch / worktree: codex/exclusive-account-roles / ProtipoFoxMind
- Starting commit: 5d9fbc74095ae73c7ccf67bbe785df00ab5c12fa
- Phase and detailed task/spec links: rol exclusivo de cuenta, alcance del coordinador
- Status: in_progress

## Request and scope
Registro con rol obligatorio y pantallas Inicio/Mis aulas adaptadas al rol de sesión. Sin cambios de backend, dominio ni tests.

## Work performed
Formulario con selección accesible y validación explícita; transporte de accountRole desde la sesión; acciones de creación o inscripción por rol y mensajes de estado vacío, con comprobación segura ante rol ausente. Se conserva la lectura de invitaciones y se explica la restricción docente. La vista previa sin sesión muestra error de rol hasta recibirlo explícitamente.
Archivos: apps/web/src/components/account-flow-forms.tsx, account-screen.tsx, classrooms-screen.tsx; apps/web/src/lib/account-client.ts; apps/web/styles/globals.css; apps/classrooms-ui/Classrooms.tsx, ClassroomCollection.tsx, ClassroomCollectionHero.tsx, Home.tsx, HomeShortcuts.tsx.

## Verification
- `npx tsc --noEmit -p apps/web/tsconfig.json --pretty false`: exit 0, incluso tras el último cambio.
- `npm run lint:boundaries --silent`: exit 0; Architecture AST boundaries passed, antes del último cambio JSX.
- `node --test --test-reporter=dot tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs`: exit 0 (14 casos).
- `npm run web:build --silent`: exit 0 antes del último cambio JSX. Primer intento falló por dos secuencias UTF-8 inválidas introducidas durante la edición; corregidas y compilación siguiente aprobada.
- Context7: cuota mensual agotada; se consultó `node_modules/next/dist/docs/02-pages/02-guides/forms.md` y se reutilizó el patrón existente.
- Validación visual y prueba integrada de rol: pendientes del coordinador.

## Commits and outcomes
Sin commit propio.

## Handoff
Coordinador debe integrar sesión/backend, verificar el flujo visual y pruebas de aceptación. La vista previa p5 debe recibir un rol explícito si se usa; no se modificó por estar fuera del alcance asignado. El estado no se marca completado hasta comprobación integrada.

## Follow-up: disposable fixtures and preview — in progress

Scope: `/root/frontend_roles` follow-up, scripts/*.mjs, tests/*helpers.mjs and apps/p5-preview only. Update synthetic user roles, preview context and role-exclusive folder fixture; do not modify tests or retained data. Starting commit unchanged; concurrent coordinator/agent work preserved.

### Follow-up result

- Updated `scripts/p5-runtime.mjs` to persist the role of each synthetic actor and expose it to `apps/p5-preview/main.tsx`; preview passes the explicit role into ClassroomsApp.
- Updated `scripts/prisma-smoke.mjs` and `tests/p8-grading-helpers.mjs` to seed coherent roles. The foreign P8 actor remains a teacher because correction tests explicitly verify a foreign teacher.
- Updated `scripts/activity-ai-live-seed.mjs` and `scripts/folder-preview.mjs` to register roles. Folder preview now uses a second teacher for its second classroom and the existing student joins both, avoiding mixed-role accounts.
- `node --check` on the four modified scripts and P8 helper: exit 0; `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --pretty false`: exit 0; `npx vite build apps/p5-preview --outDir ../../.test-artifacts/p5-role-preview`: exit 0 with unresolved runtime asset and module directive warnings; `node --test --test-reporter=dot tests/p8-grading.test.mjs`: exit 0 (9 dots, isolated disposable DB).
- No retained database used. Full P5 runtime and interactive preview not run; coordinator should include them in integrated verification. No commit made.

### Corrección de acciones por rol

El hero de Mis aulas y los accesos de Inicio ahora muestran «Unirse con código» solamente a estudiantes; «Crear aula» permanece limitado a docentes. La descripción de Mis aulas ya no sugiere roles combinados. `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --pretty false`: exit 0. Pendiente comprobación visual integrada por el coordinador.
