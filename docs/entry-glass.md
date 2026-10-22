# Entry glass experience

This local UI feature restyles account entry, companion account flows, Inicio and the shared navbar. It does not change authentication policies, API/database contracts or academic page bodies. The canonical specification is [the feature document](../odd/tasks/foxmind-entry-glass.md).

## Shared navigation

`apps/shared-ui/AppNavbar.tsx` owns presentation, route indication and the responsive disclosure. Each existing page retains its session and logout owner. Desktop navigation uses links; mobile navigation opens through the account/menu button and supports keyboard operation, Escape/focus return and outside dismissal. Modified link clicks retain browser navigation semantics.

`AccountNavbar` receives account state from its page. The file panel reports its existing session to the files page; it does not add a competing identity provider. Verified account/files pages use the existing notifications model and unread semantics. Selecting an item navigates to `/mis-aulas?notificacion=<id>`; only a UUID-shaped identifier is admitted by the page, and the existing server-authorized notification-open operation resolves its current academic destination. The query itself grants no access. Existing academic navigation continues opening notifications directly.

The classroom wizard keeps its existing ownership of save/exit. Global navigation must not bypass that workflow. Existing post-login continuation remains a bounded classroom destination or `/profile`.

## Account forms

The existing handlers, CSRF/session client, validation, cooldowns, token capture and neutral account-existence feedback remain in place. Password visibility is a non-submit button. Every secret field carries `data-password-field`, so request completion clears it even when its type is temporarily text. Password creation guidance appears for `new-password`, not ordinary sign-in. Nonsecret fields remain available after recoverable errors.

## Inicio and styling

Inicio uses actual authorized classroom and notification adapters. Enseño/Estudio are classroom perspectives, not a global user role. A sole populated context is initially selected; explicit selection remains while the mounted view refreshes. Actual metadata, archived state, pending drafts/invitations, timestamps, news read state and current server-checked destinations are retained.

Glass styles are scoped to the navbar, account pages and Inicio. Existing classroom covers are reused. The backdrop and book are independent local raster assets, not UI screenshots; [asset provenance](../apps/web/public/entry-glass/README.md) documents their generation and optimization. No dependencies, remote fonts or CDN assets were added.

Bright orange primary actions use navy labels rather than copying low-contrast white-on-orange bitmap text. Browser measurements observed primary text7.3314:1 and form input boundary3.5727:1. These measurements are not a blanket accessibility certification. CSS supplies opaque fallbacks, visible keyboard focus and reduced-motion behavior.

## Verification

Use the current feature log for exact observed outcomes and remaining proof. Focused tests include `entry-glass-client`, actual `entry-glass-browser`, P3 accounts, P9 Home/recovery and P6 mobile navigation. Stateful suites own disposable resources; never substitute retained demo data or run the generic database test command blindly.

Production Next builds must run in the isolated feature checkout, not in another checkout serving a retained preview. This worktree originally used an external dependency junction; Turbopack could not resolve it. An owned byte-matching dependency copy resolved the build without configuration or lock-file changes. [Turbopack root documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory) explains linked-root resolution.

Native review remains off/global. No deployment, merge or push is authorized by this feature.

Final scoped verification: independent Sol/xhigh passed real glass7, account10, private-file9 and matched baseline6 cases, all exit0/0SKIP. Academic body measured geometry/text/styles remained equal at1448/390 with baseline GET-only and unchanged domain hash. Exact evidence and historical setup failures are in the attributed work record. Universal accessibility/native browser zoom and standalone Vite runtime are not claimed.
