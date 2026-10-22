# Platform shared presentation implementation

- Agent / role: /root/platform_styles, bounded UI writer (gpt-6.1-sol).
- Session or task ID: /root/platform_styles; registered session identity unavailable.
- Persisted by: /root coordinator, from the writer's completed handoffs.
- Date: 2026-10-21 (client timezone).
- Branch / worktree: codex/foxmind-entry-glass, isolated glass worktree.
- Starting commit: c6a4c08c94040ca6b115ce8b4899d532fcc82a6f.
- Phase / scope: authorized platform presentation integration; no product-phase integration.
- Status: completed within parent verification limits.

## Work performed

Added apps/shared-ui/design-tokens.css and platform-glass.css. Shared palette/font/semantic tokens consumed by academic styles, web globals and entry aliases. Both Next and standalone entrypoints load tokens, academic, platform and entry in the intended cascade. Files route receives only a presentation class. Refined cards, room context/header/tabs, wizard/Plan/Library/Muro, activities/authoring/attempt/grading/progress surfaces, native fields and file controls. Checkbox/radio sizing no longer inherits text-input dimensions. Native dialogs centered with bounded height and nonshrinking close target. Preserved Home/navbar composition, native behavior, focus/semantic states and accessibility preference fallbacks.

Allowed surfaces only: apps/shared-ui/{design-tokens,platform-glass,entry-glass}.css; apps/classrooms-ui/{styles.css,ClassroomsApp.tsx}; apps/web/styles/globals.css; apps/web/pages/{_app,files}.tsx; tests/platform-glass.test.mjs. No handlers, dependencies, backend/data, services, browser or Git mutations. Exact frontend-design and vercel-react-best-practices skills loaded (paths-injected).

## Verification

- New deterministic style contracts: initial RED7 then GREEN7; standalone-cascade RED1 then GREEN; disabled native-control cascade RED1 then GREEN9.
- node --test tests/platform-glass.test.mjs tests/entry-glass-client.test.mjs tests/entry-glass-polish.test.mjs tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/p5-ui-client.test.mjs: 31PASS,2 origin-dependent SKIP,0FAIL before final heading-only correction.
- Parent visual finding: academic h3/h4/h5 inherited body weight under host reset. Bounded correction sets main/dialog h3=1.15rem/750, h4=1rem/700, h5=.9375rem/700, preserving more-specific entry headings. RED9PASS/1FAIL then final platform10PASS.
- npm --prefix apps/web run typecheck: exit0. git diff --check: exit0.

## Commits and handoff

No commits. Parent owns production build/restart and rendered verification; independent verifier reported no candidate-caused blocker. See [coordinator](2026-10-21-root-platform-glass.md) and [verification](2026-10-21-platform-verify.md).
