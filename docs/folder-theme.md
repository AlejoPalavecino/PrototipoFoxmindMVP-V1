# FoxMind folder theme

The selected 24 desktop mockups are implemented as presentation on the existing complete V1. API clients, server policies, session/token/password rules, classroom membership, private files, attempts, grading and publication remain owned by the existing application. No database migration or backend rewrite is part of this change.

## Presentation

`apps/shared-ui/folders.css` is the sole theme entry point in Next and the standalone classroom renderer. It imports shared control safeguards, outlined navigation/folder geometry, account composition and academic presentation. Tokens define white paper, mint/coral/yellow context, orange actions, solid cream shadows and a separate keyboard-focus color. Native dialogs, buttons, fields, radio/checkbox controls and reduced-motion/forced-colors handling remain.

The two account perspectives are shown together on Inicio and Mis Aulas. The teacher/student role continues to come from each classroom. Existing creation/join entry points are retained on Inicio as well as Mis Aulas. Existing authentication destinations are preserved. The old planning package proposed additional navigation and summary changes; those proposals are not silently treated as delivered behavior here.

## Coverage

| Selected references | Existing application surfaces |
|---|---|
| 01–03 | Sign-in, registration and verification; shared system also covers recovery screens |
| 04 | Mis Aulas, simultaneous Estudio/Enseño and pending work |
| 05–09 | Existing four-step creation wizard and real successful publication state |
| 10–17 | All eight teacher sections, existing management and confirmations |
| 18–23 | All six student sections, server-derived permissions |
| 24 | Profile, personal data and password change |
| Additional existing V1 | Inicio, notifications, private files, activity authoring, attempts/submissions, correction and published results |

Artwork and illustrative mock data are not permission rules. Filters, fake grades, fictitious pending activities or unsupported APIs have not been added to imitate a screenshot. Plan management uses native disclosures for secondary rename/reorder/delete actions; topic state stays visible. Library file selection is collapsible while upload/validation/result feedback remains visible.

## Verified tab silhouette candidate

The verified `codex/folder-tabs-ready` implementation adds a shared SVG frame with fixed shoulder/slope caps, contextual yellow/mint/coral fills and inclined native navigation. Account and wizard panels reserve enough space above their headings; an opaque center and thin CSS outline keep fallback labels readable. Forced colors preserve a non-color active-navigation marker. [Verification](work-log/2026-10-24-root-folder-tabs-ready.md), [selected browser evidence](work-log/evidence/2026-10-24-folder-tabs/README.md) and [local main integration](work-log/2026-10-24-root-tabs-main-integration.md) define the correction and its limits. Integrated into local main via fast-forward to `a6fe079`; no remote publication or deployment.

## Foxy

Three transparent PNG assets live in `apps/web/public/folders/`: welcome, reading and logo. Their provenance and prompt intent are in that directory's README. Existing locally vendored Bootstrap Icons supply UI symbols, including the new official envelope and lock assets under the same license.

## Run and verification

Use the existing install/build scripts. `node scripts/folder-preview.mjs` requires a completed API/production web build and the existing local Docker images. It creates only owned disposable database/storage/scanner/mail resources, registers synthetic accounts through the actual HTTP and captured-mail interfaces, and seeds two classrooms plus activities through real authorized APIs. It prints the loopback origin, not passwords or infrastructure credentials. Ignored `.test-artifacts/folders/browser-fixture.json` contains synthetic test login information only; never stage it.

The preview prints a unique stop-file path. Creating that file, pressing Enter in its terminal or sending a handled termination signal returns through the existing ownership-checked cleanup. Do not reuse this helper against retained development data. Stop its server before rebuilding production assets; a running Next production process caches its build's asset manifest.

Observed checks and their limits are recorded in [the implementation work record](work-log/2026-10-22-root-folder-implementation.md). Visual comparison and user design acceptance are separate from compilation and API/client tests. No remote publication or deployment is included.
