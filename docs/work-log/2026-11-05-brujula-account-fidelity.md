# Fidelidad Brújula de cuenta — implementación entregada para QA global

- Agent / role: worker
- Session or task ID: /root/brujula_account_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula; checkout compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: FASE_GREEN visual; odd/tasks/foxmind-brujula.md BRU-02/05
- Status: in_progress

## Request and scope
Alinear perfil, configuración y avisos con HTML aprobado. Sin backend, datos simulados, secretos, commits ni publicación. Navbar fuera del alcance. QA global navegador a cargo del coordinador.

## Work performed
Inspeccionados roadmap, protocolo, tarea, estado Git, componentes cuenta/avisos y referencia HTML legible. Checkout tiene cambios previos y agentes concurrentes; se preservan.

- apps/shared-ui/brujula-account.css: nuevo override privado; panel680, padding23/17 móvil, avatar55 violeta, inputs11, botones12, panel19; tipografía y colores de overrides finales del HTML. Avisos compactados como filas y diálogo560/radio20, manteniendo DOM y handlers vigentes.
- apps/web/src/components/account-profile.tsx: avatar y nombre real dentro del panel, rol real; se retira tarjeta secundaria de seguridad redundante con navegación.
- apps/web/src/components/account-settings.tsx: título Contraseña y sesión horizontal con correo real.
- apps/web/src/components/account-screen.tsx: eyebrow Mi cuenta; se retira montaje del rail ilustrado y se conservan carga, sesión, validación, feedback y submit.
- apps/web/src/components/account-view.ts: copy de perfil/configuración aprobado.

## Verification
- node --test tests/notifications-presentation.test.mjs tests/foxmind-3d-flows-account.test.mjs: PASS 6, FAIL0; no mutaciones al abrir cuenta, campos separados, correo readonly, notificaciones/lectura/filtro/error/destino conservados.
- npx eslint apps/web/src/components/account-profile.tsx apps/web/src/components/account-settings.tsx apps/web/src/components/account-screen.tsx apps/web/src/components/account-view.ts: exit0.
- git diff --check: exit0; solo avisos CRLF de archivos ajenos.
- PostCSS parse de apps/shared-ui/brujula-account.css: PASS,64 nodos superiores.
- Intento inicial agregado con tests/p33-registration-profile.test.mjs: seis casos anteriores PASS, archivo P33 FAIL antes de pruebas por Owned D2 runner required. No se fuerzan variables ni fixtures; integración DB no verificada por este agente.
- QA navegador, responsive y accesibilidad visual: pendiente del coordinador, no se declara comparación pixel a pixel.

## Commits and outcomes
Sin commits. Implementación local y regresión focal aprobada; entrega visual completa pendiente de importación y QA global.

## Handoff
Coordinador: importar brujula-account.css después de estilos Brújula previos y comprobar perfil/configuración/notificaciones a ambos roles y anchos. Diferencias conservadas por contratos vigentes: Cancelar, ayuda16–128 y Mostrar/Ocultar; no se agrega campo repetir contraseña de maqueta porque contrato actual contiene currentPassword/newPassword. Notificaciones mantienen acciones explícitas de abrir/marcar en vez de simular el centro de avisos de la maqueta. No hay backend, publicaciones ni secretos tocados.
