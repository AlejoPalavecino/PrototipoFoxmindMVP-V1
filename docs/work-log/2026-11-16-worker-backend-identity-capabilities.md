# TASK-013 — Identity por capacidades y ciclo de vida

- Agente: /root/backend_identity_capabilities, chuli_worker. Fecha: 2026-11-16.
- Rama/worktree: codex/backend-capabilities, C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind.
- Base: dd6f4bc92b959cce0e2c68343291614270c4a17e; árbol concurrente preservado.
- Alcance: accounts cohesivo, sessions y mail-delivery; composición/lifecycle en bootstrap. Sin cambios de producto, esquema, proveedores, datos o publicación.
- Autorización: TASK-013 del diseño backend-capabilities aprobado; ownership recibido del coordinador.
- Verificación: pendiente. No se afirma aislamiento efectivo de pruebas.
- Primer paso: caracterización existente y restricción lifecycle RED antes de transformar.

## Transformación y APIs

- 24 movimientos en `.test-artifacts/backend-capabilities/identity-move.json`: 22 archivos previos + runtime-lifecycle.test.mjs nuevo y resto según mapping. El mapping es la enumeración exacta; se conserva para integración por el coordinador.
- Accounts conserva application/runtime y puertos, security/persistencia/adaptador/session-query, y transporte/cookies. Perfil conserva su runtime y su tx compartida; no se crea capacidad vacía.
- Sessions posee application/session-contracts; accounts lo consume por sessions/public.ts. Mail-delivery posee mail/outbox y un contrato application/ports (AccountMailInput, MailAcceptance, AccountMailSender). APIs públicas sólo nombradas de application/domain.
- Dominio compartido puro conservado en identity/domain. Sin cambios SQL, locks, contratos HTTP, reglas, esquema ni transacciones.
- Configuración agregada y lifecycle se movieron literalmente a bootstrap/identity-configuration.ts e identity-mail-lifecycle.ts (ownership ampliado por /root). El helper scoped ya remapeó estos imports; se corrigió una duplicación accidental de ruta durante el ajuste manual antes de verificar.
- Extracción semántica: hooks/stop/shutdown retirados del runtime application y delegados por el runtime host. Mail dependency retirada del puerto application. SMTP adapter pierde decoradores/Nest, cambia hook a close(); wrapper AccountMailService en identity-mail.module.ts conserva DI y onModuleDestroy.

## Evidencia observada

1. `node --test .../identity/application/runtime.test.mjs`: bloqueado por ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX (parameter properties de TypeScript; runner strip-only). No se interpreta como regresión funcional.
2. `node --experimental-transform-types --test apps/api/src/modules/identity/application/runtime.test.mjs`: baseline 3/3 PASS.
3. Nuevo runtime-lifecycle.test.mjs, mismo runner: RED 0/1 por `onApplicationBootstrap belongs to bootstrap`.
4. `node --experimental-transform-types --test apps/api/src/modules/identity/accounts/application/runtime.test.mjs apps/api/src/modules/identity/accounts/application/runtime-lifecycle.test.mjs`: GREEN final 7/7. Tres caracterizaciones originales sin pérdida de aserciones; cuatro regresiones de frontera/lifecycle/host. Timers simulados, sender y persistencia sintéticos. Incluye cierre idempotente, espera de invocación activa, errores contenidos y no reprogramación tras stop.
5. `node node_modules/eslint/bin/eslint.js apps/api/src/modules/identity apps/api/src/bootstrap/identity-runtime.ts apps/api/src/bootstrap/identity-configuration.ts apps/api/src/bootstrap/identity-mail-lifecycle.ts apps/api/src/bootstrap/identity-identity.module.ts apps/api/src/bootstrap/identity-mail.module.ts`: PASS, exit 0.
6. `node --test tests/audit-boundaries-guard.test.mjs`: 29/29 PASS.
7. `checkBoundaries(process.cwd())` filtrado por `/identity/` o `/identity-`: `[]`, PASS. El primer guard global observó 4 fallos transitorios ajenos (files/agenda concurrentes), sin hallazgos Identity.

## Integración a cargo del coordinador

- Remapear consumidores e inventarios por identity-move.json. runtime.test.mjs cambia de ruta; runtime-lifecycle.test.mjs (4 tests) es alta nueva para inventario/suite pure.
- Cambio de símbolo, adicional al movimiento de archivo: AccountMailService como token Nest y API onModuleDestroy ahora se importa de `apps/api/src/bootstrap/identity-mail.module.ts`. Los tests SMTP/mailer/cancellation que usaban el adapter con hooks deben consumir ese wrapper host. El adapter movido conserva tipos reexportados pero sólo ofrece close(). AccountMailSender sigue reexportado desde outbox/worker para compatibilidad de tipos.
- Compilación fresca conjunta, tipos, inventario global, suites transport/mail y pruebas DB/SMTP reales aisladas pendientes del coordinador. No ejecuté build global mientras otros escribían ni accedí a servicios, datos retenidos, secretos, proveedores o red.
- Estado: implementado y comprobado por fuente local; no marcar DONE hasta integrar consumidores, compilar y verificar contratos completos.
- Revertir unidad: invertir exclusivamente las 24 entradas del mapping y restaurar los cambios propios de exports/bootstrap, wrapper y documentación mediante diff revisado. Retirar sólo los nuevos public.ts, mail-delivery/application/ports.ts, runtime-lifecycle.test.mjs y este registro si se revierte por completo. Sin reset global; preservar cambios concurrentes. No hay cambios de datos para revertir.
