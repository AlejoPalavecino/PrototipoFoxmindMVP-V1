# Brújula auth completa — candidato congelado para QA global

- Agent / role: worker
- Session or task ID: /root/brujula_account_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula / compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: FASE_RED/GREEN, odd/tasks/foxmind-brujula.md; coordinador 2026-11-05-id-unavailable-brujula-complete-base.md
- Status: in_progress

## Request and scope
Paridad auth/cuenta aprobada con confirmación cliente contraseña en reset/settings, contrato servidor intacto. Sin servicios, secretos ni publicación. Preservar16–128, nombres80 codepoints, emailamplio/dominiominúsculas,rolexclusivo,CSRF,nextsafe,tokenfragment,anti-enumeración,cooldown y sesiones.

## Work performed
Leídos AGENTS.md web, guía CSS Next local node_modules/next/dist/docs/02-pages/01-getting-started/06-css.md, identidad web y referencia account/auth. Checkout compartido preservado.

- apps/web/src/components/account-screen.tsx: wrapper Brújula aislado de clases visuales antiguas, visual izquierda/formderecha en todos los flujos públicos. Marca y arte local; sin navbar privado ni datos demo. Confirmación requerida y comparada antes de action; se elimina confirmPassword antes del contrato servidor; token original solo en confirm explícito.
- apps/web/src/components/account-flow-forms.tsx: reset con Repetir contraseña, rol visible Alumno conservando aria-label Estudiante, leyenda Rol de la cuenta; retiro tarjeta promocional ajena a referencia. Verificación conserva reenvío/estado/token y no simula verificación.
- apps/web/src/components/account-settings.tsx: Repetir contraseña nuevo, mismo submit real.
- apps/web/src/components/account-field.tsx: ayuda16–128 sin duplicar para confirmación; ver/ocultar, autocomplete y campos amplios conservados.
- apps/web/src/components/account-view.ts: títulos y descripciones del HTML adaptados al acceso real, sin menciones demo.
- apps/shared-ui/brujula-auth.css: nuevo layout43/57, formulario420, Lexend local, campos39/radio11 y botones37/radio12 del HTML; móvil590 sin visual. Texto Acceso a FoxMind. Visual usa exactamente los bytes incluidos en referencia, SHA256 banner-docente 5865ade9b113d45cedd8fd8aaa87696eea15756046f4e441dcf0abf24849b4a7 y foxy-bienvenida cd1eb658b00043c5ab523a401ed20a48494e938b4bcd846f27c978c6d6ba225c.
- tests/brujula-auth-parity.test.mjs: invoca componentes y submit reales con puertos controlados, verifica campos y bloqueo mismatch, matching sin confirmPassword al backend y token original.

## Verification
- RED: node --test tests/brujula-auth-parity.test.mjs antes de implementación: FAIL2, ambos mismatch emitían una mutación.
- GREEN: mismo comando PASS2/FAIL0. También comprueba campo real confirmPassword con autocomplete new-password en ambos forms.
- node --test tests/brujula-auth-parity.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/p3-web-client.test.mjs tests/exclusive-account-role.test.mjs tests/notifications-presentation.test.mjs: PASS18/FAIL0.
- Después de aislar clases legacy: node --test tests/brujula-auth-parity.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/p3-web-client.test.mjs: PASS8/FAIL0.
- npx eslint apps/web/src/components/account-screen.tsx apps/web/src/components/account-flow-forms.tsx apps/web/src/components/account-settings.tsx apps/web/src/components/account-view.ts apps/web/src/components/account-field.tsx: exit0 (repetido tras última edición).
- PostCSS parse brujula-auth.css: PASS.
- git diff --check: exit0 (avisos CRLF solo de archivos concurrentes).
- node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false: exit1 por cambios concurrentes Home: home-labels.ts TS2739 faltan drafts/submitted; HomeModule.tsx TS7053 icon map sin esas claves. Sin errores auth observados. Reportado al coordinador; no se cambia superficie ajena.
- Build y QA navegador global no ejecutados por este agente; entrega no se declara verificada visualmente.

## Commits and outcomes
Sin commits. Freeze de archivos arriba al entregar; no hay publicación.

## Handoff
Coordinador: importar brujula-auth.css al final de estilos; completar build/tipos y QA login/register/verify/forgot/reset/settings ambos roles y móvil. Confirmación usa name confirmPassword; actualizar recorridos reales para completar ese campo. Se conservan reenvío/estado/salir, notices/cooldown y ayuda de seguridad reales aunque maqueta no los modele; no se copian cuentas demo, contraseña8, magicverify, persistencia local ni mensajes enumeradores. Nuevo registro queda in_progress hasta QA global.
