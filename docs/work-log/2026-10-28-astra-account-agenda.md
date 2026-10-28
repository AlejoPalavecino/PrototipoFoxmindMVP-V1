# Cuenta, archivos y Agenda — pulido de presentación

- Agent / role: astra_account_agenda / implementación CSS.
- Session or task ID: `/root/astra_account_agenda`.
- Date: 2026-10-28.
- Branch / worktree: `codex/foxmind-visual-polish`, `C:/Users/alejo/.codex/worktrees/foxmind-visual-polish/ProtipoFoxMind`.
- Starting commit: `fa3ce749f9bd9e8011dcf71a155e061a9f1e73ca`.
- Phase and detailed task/spec links: pulido transversal posterior a P0–P9; [contrato](2026-10-28-astra_visual_design.md), [roadmap](../implementation-roadmap.md), [especificación §§4,12,13](../foxmind-v1-functional-spec.md).
- Status: completed (implementación CSS y comprobaciones focalizadas; QA integrada pendiente).

## Request and scope

Delegación del coordinador: pulir auth auxiliar, perfil, configuración, archivos y Agenda conservando composición, imágenes, campos, mensajes, calendario42, colores personales y comportamiento. Ownership CSS de cuenta/Agenda y este registro. Sin tests editados, commits, runtime del usuario, datos, backend ni publicación. Foundation mantiene tokens/shell/controles; liberó auth-polish después de mover la fuente, pero esta unidad no necesita editarlo.

## Work performed

Leídos contrato de diseño, roadmap, protocolo, AGENTS raíz/web, skill clean-architecture, especificación relevante y guía CSS local de Next. Inspeccionados componentes actuales de auth/cuenta/archivos y formulario de Agenda, estilos y suites existentes. Git observado en la rama/base indicadas con cambios concurrentes de foundation; se preservan.

- `apps/shared-ui/foxmind-3d-account.css`: ritmo de campos52px, títulos/lectura, enlaces auxiliares44px, notices/cooldown/estados, verificación, perfiles/configuración y acciones móviles. Nuevas reglas excluyen `entry-auth-polish`; login/register y auth-responsive quedan intactos en esta unidad. Conserva arte y grillas existentes.
- `apps/shared-ui/foxmind-3d-files.css`: nueva hoja scoped a `platform-files`, importada por account. Panel de cuota, selección nativa de archivo, validación, título largo, acciones y vista previa reciben jerarquía, bordes y espaciado coherentes; no oculta estados ni altera la admisión/descarga.
- `apps/agenda-ui/foxmind-agenda.css`: contraste de días externos/selección/today, foco inset que permanece dentro de la grilla recortada, jerarquía de cards, lectura de descripción y vacío, controles/ayudas/chips/errores/formulario modal. Fechas pasan a una columna hasta420px. Sin cambios de grilla42, selección/CRUD, colores personales, privacidad o arte.
- Sin TSX, contratos, fuentes, tests, assets ni archivos ajenos modificados. Las redefiniciones de calendario/control conservan el alcance de sus selectores actuales.

## Verification

La búsqueda inicial de guía Next en `01-app/02-guides/styling.md` no existía; inventario corrigió a `02-pages/01-getting-started/06-css.md`. No fallo de producto.

- `node --input-type=module` con `postcss.parse` para las tres hojas: PASS3/3;122/58/132líneas respectivamente, exit0.
- `git diff --check -- apps/shared-ui/foxmind-3d-account.css apps/shared-ui/foxmind-3d-files.css apps/agenda-ui/foxmind-agenda.css`: sin diagnósticos.
- `node --test --test-reporter=dot tests/p3-web-client.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/agenda-polish-presentation.test.mjs tests/foxmind-3d-flows-agenda.test.mjs`:16puntos PASS, exit0. No pruebas nuevas de valores CSS ni RED artificial para esta modificación de presentación.
- Cálculo WCAG sRGB sobre pares declarados: días externos `#646e89/#fafafb`4.87:1; selección `#ad4214/#fff0e7`5.29:1; CTA `#080b30/#ff782d`7.25:1; borde control `#7c86a6/#fff`3.61:1; texto secundario sobre panel `#53649b/#f5f6fb`5.31:1. Esto valida pares de fuente, no sustituye auditoría de píxeles compuestos.
- Build/strict types, capturas responsive, teclado/zoom y QA visual integrada se dejan al coordinador/verificador para evitar builds concurrentes. No E2E autenticado ni prueba de persistencia ejecutados.

## Commits and outcomes

Sin commit propio. CSS implementado y comprobaciones focalizadas aprobadas; ningún cambio de comportamiento que requiera RED. El coordinador mantiene el ownership de roadmap, memoria y commits.

## Handoff

Primer paso pendiente: QA integrada del coordinador sobre forgot-password/recover-password/verify-email/profile/settings/files y Agenda, desktop/móvil, modal, error/cooldown/disabled y archivo/preview sintéticos. Verificar especialmente foco de celda seleccionada dentro de la grilla, filas de fecha hasta420px y perfil con texto largo. La implementación está lista para esa inspección; no se declara fase ni DoD global completo.

## Delta de QA — pestañas vacías de auth auxiliar

El coordinador observó dos contornos vacíos sobre la tarjeta de forgot-password ready a390px en su QA del harness53181. Inspección confirma que `folders-tabs.css` crea `.folder-panel::before` y `::after` con `content: ''`, bordes e insets negativos para los labios de carpeta. La tarjeta auxiliar conserva `surface folder-panel tone-yellow`, mientras su encabezado decorativo ya estaba retirado por la capa3D. No contienen texto ni controles.

Se añade únicamente un comentario y una regla agrupada en `foxmind-3d-account.css`: `.fm3d-theme .entry-page:not(.entry-auth-polish) .auth-main > .surface.folder-panel::before/::after { content: none; }`. Aplica a forgot/recover/verify; excluye login/register y no alcanza profile/settings ni carpetas académicas. Ningún cambio de TSX ni `display:none` nuevo. La expansión inicial de glob `folders*.css` como argumento literal falló en Windows; se corrigió con `rg -g 'folders*.css'`.

PostCSS del account: PASS, exit0; `git diff --check` de account y registro: sin diagnósticos, exit0. La captura posterior pertenece al coordinador; esta unidad no abre navegador ni afirma la corrección visual observada. Sin nuevo commit ni tests espejo.
