# UI-03 — Acceso y cuenta expresivos

- Agent / role: account / worker
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch / worktree: codex/foxmind-escritorio-expresivo
- Starting commit: ec024bc
- Phase and detailed task/spec links: [UI-03](../../odd/tasks/foxmind-escritorio-expresivo.md), [especificación](../foxmind-v1-functional-spec.md)
- Status: completed

## Request and scope

Acceso, registro con rol primero, verificación y recuperación. Mantener destinos, contratos y reglas de cuenta.

## Work performed

- `apps/web/src/components/account-flow-forms.tsx` ubica los radios nativos de rol antes de los datos personales. Presenta qué puede hacer cada rol con nombres y descripciones accesibles. Recuperación utiliza las variantes de campos del acceso.
- `apps/web/src/components/account-screen.tsx` y `apps/web/src/components/account-surface.module.css` aplican color crema, naranja oscuro, bordes visibles y foco explícito a las pantallas públicas de cuenta. Se reutilizan las ilustraciones vigentes.

## Verification

- `node --test tests/auth-reference-navigation.test.mjs tests/entry-glass-client.test.mjs` dio 8 PASS. El render estático adicional del componente real confirmó dos radios sin preselección antes de Nombre.
- `npx tsc --noEmit -p apps/web/tsconfig.json` y ESLint de los dos TSX de cuenta pasaron. `git diff --check` de los tres archivos de código pasó. El primer comando npm con `--workspace` era inaplicable porque el repositorio no usa npm workspaces.
- Una corrida adicional que incluyó `tests/foxmind-3d-regressions.test.mjs` dio 11 PASS y 1 fallo en la inspección de limpieza de la base de Agenda. Es independiente de la verificación dirigida de cuenta.
- `ego-browser skill` no está disponible en PATH. Alternativa local de Playwright con `/api/v1/auth/session` sintético. El primer intento Turbopack falló por el import compartido de `workspace-desk.css` durante cambios concurrentes y repitió el error tras reinicio. Webpack excedió los primeros plazos y después reportó que no podía analizar TSX externo. Al mover la caché dev generada a artefactos locales y volver a Turbopack se recuperó la compilación.

- `npm run web:dev` + `node .test-artifacts/account-expressive/check.mjs` pasó 15 comprobaciones de rutas (acceso, registro, verificación y dos rutas de recuperación en 320, 390 y 1440 px), sin desborde horizontal ni errores de página. Comprobó rol antes de Nombre, selección de Estudiante con flechas y destino de invitación exacto en el enlace de registro a acceso. Simuló login 401, preservó correo, limpió contraseña y presentó el error. Simuló solicitud de recuperación 204, mostró confirmación genérica y espera. Capturas en `.test-artifacts/account-expressive/`; revisión manual de acceso, registro y verificación a 320 y registro a 1440. No se ejercieron entrega de correo ni persistencia de identidad.

- `node .test-artifacts/account-expressive/proofs.mjs` dio 2 PASS: el script real de captura retiró el fragmento con token sintético, las confirmaciones enviaron el token correspondiente y las respuestas simuladas 204 conservaron la invitación al verificar y mostraron la confirmación al recuperar la contraseña.

## Commits and outcomes

Cambios locales en el árbol compartido.

## Handoff

Evidencia entregada al coordinador de UI-06. El servidor Next dev de QA se cerró después de la verificación coordinada de Foxy y se restauró el cambio generado de `apps/web/next-env.d.ts`.
