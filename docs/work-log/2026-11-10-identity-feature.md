# TASK-013 — Identidad frontend

- Agente: /root/identity_feature, implementador delegado; sesión no expuesta.
- Fecha: 2026-11-10. Rama: codex/architecture-foundation. Base: 9821584.
- Alcance autorizado: migración mecánica identity api/model/ui, screen y puentes; pruebas de contrato y remapeo de tests. Sin producto, Git writes, DB, proveedores ni cambios al tablero.
- Superficie: features/identity, screens/identity-screen, account-* y account-client legacy, ocho páginas de cuenta, tests delegados y este registro. Padre escribe shared/global/guard.
- Estado: preparando RED. Aceptación integrada y QA a cargo del coordinador.

## Implementación y mapa público

La única implementación de cliente/tipos AccountUser y AccountSession/AccountError/validateAccountFields queda en `apps/web/src/features/identity/api/account-client.ts`. `model/account-view.ts` conserva AccountView y accountContent; `model/form-types.ts` recibe AccountSubmit. `ui/account-{field,flow-forms,profile,settings}.tsx` y `ui/account-surface.module.css` conservan UI/CSS. Usan los primitivos shared creados por el coordinador. `screens/identity-screen.tsx` conserva la coordinación completa AccountScreen, importa la feature pública, destinos y navbar global. Sin hooks/providers/reglas nuevos.

`features/identity/index.ts` exporta explícitamente runtime AccountError, createAccountClient, validateAccountFields, accountContent, AccountField, AccountFlowForms, AccountProfile, AccountSettings, accountSurface; tipos AccountSession, AccountUser, AccountView y AccountSubmit. No exporta proxy/servidor. AccountView ya no depende de la pantalla.

Puentes:
- `lib/account-client.ts` -> `../features/identity/api/account-client.ts`: runtime AccountError/createAccountClient/validateAccountFields y tipos AccountSession/AccountUser. Target API directo conserva importación Node sin cargar TSX.
- `components/account-{field,flow-forms,profile,settings}.tsx` -> `../features/identity/index`: su componente nombrado; profile conserva además type AccountSubmit.
- `components/account-view.ts` -> `../features/identity/index`: accountContent y type AccountView.
- `components/account-screen.tsx` -> `../screens/identity-screen`: AccountScreen; -> `../features/identity/index`: AccountField y type AccountView.
- `components/account-surface.module.css`: únicamente @import hacia `../features/identity/ui/account-surface.module.css`.
- `apps/web/pages/{index,sign-in,register,verify-email,forgot-password,recover-password,profile,settings}.tsx`: importan screen nueva; resto literal preservado, incluidas exportaciones SSR/headers.

## Evidencia observada

RED antes de implementar: `node --test tests/identity-feature.test.mjs` -> 0 PASS / 2 FAIL, ambos ENOENT de features/identity/index.ts ausente, causa esperada.

GREEN final:

```text
node --test tests/identity-feature.test.mjs tests/p3-web-client.test.mjs tests/account-avatar-selection.test.mjs tests/auth-reference-navigation.test.mjs tests/brujula-auth-parity.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/folder-platform.test.mjs tests/entry-glass-client.test.mjs
29 PASS / 0 FAIL / 0 SKIP (exit 0)
git diff --check
exit 0
```

La prueba nueva inspecciona frontera de imports/exports de la feature, API pública/browser y error rate-limit, identidad real del cliente legacy/API canónico mediante imports Node y puentes UI mediante inyección del target. La comprobación estática no sustituye el guard AST integrado del coordinador.

Comparación determinista con Python ejecutada por stdin: git show 9821584:<origen> frente al archivo destino, desde declaración AccountScreen/FlowProps/AccountField/AccountProfile/AccountSettings/AccountView/AccountUser y CSS completo. Resultado 8 EQUIVALENT / 0 diferencias, incluyendo JSX, efectos, validación y mensajes. Ocho páginas comparadas aplicando exclusivamente sustitución del import account-screen -> identity-screen: 8 PAGE_IMPORT_ONLY / 0 diferencias.

Tests existentes editados: account-avatar-selection, auth-reference-navigation, brujula-auth-parity, foxmind-3d-flows-account, folder-platform y entry-glass-client. Sólo rutas de archivos, targets de mock y carga del barrel real para conservar UI al inyectar createAccountClient; ninguna aserción modificada. p3-web-client queda intacto e importa el puente real.

Fallo intermedio preservado: primera selección dio 25 PASS / 1 FAIL (archivo p3-web-client), porque Node no resolvía el target extensionless de account-client legacy. Se agregó extensión .ts al reexport; repetición final 29 PASS. No se cambió aceptación.

## Límites y entrega

No ejecuté build global, DB, proveedores, CI completa ni QA navegador: corresponden a TASK-015/coordinador. No escribí guard/shared/navbar/proxy, documentos canónicos ni tablero. Sin commits, publicación ni despliegue. Diff supera 400 líneas por traslado literal de una unidad cohesionada; no se comprimió código ni eliminó documentación para reducirlo.

Consumidores legados fuera de superficie informados al padre: apps/web/src/components/account-artwork.tsx (sólo tipo; artwork huérfano), apps/web/pages/files.tsx (cliente), tests/helpers/auth-reference/harness.mjs y tests/helpers/platform-polish/harness.mjs (screen bridge), tests/p5-web-client.test.mjs (mock cliente previo). Continúan soportados por los puentes; remapeo/cierre integrado a cargo del coordinador.

Criterio pendiente: aceptación integrada con guard/tipos/build/CI/QA y verificación independiente. Este registro no declara DONE. Primer paso: coordinador congela mapa de puentes, reconcilia consumidores y ejecuta TASK-015.

Reversión de la unidad: restaurar sólo los account-* y account-client legados, las ocho páginas y seis tests editados desde 9821584; retirar features/identity, screens/identity-screen, tests/identity-feature.test.mjs y este registro. Coordinar antes con el padre por imports nuevos hacia identity que haya creado; no restaurar archivos shared/global/tablero/guard ni recursos ajenos.
