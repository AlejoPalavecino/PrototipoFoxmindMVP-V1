# URL Navigation and Route-Level Loading

## Objective and authorization
User requested committing the verified stability block and continuing URL navigation plus route-level lazy loading.
Branch: feat/frontend-url-navigation.
Base: 698a9924e378f80265c29746c65fe844a6dcb013.
No push, PR, merge, redesign, authentication/backend expansion or unrelated Judgment Day fixes.
Preserve .env.example and the three unrelated existing untracked ODD documents.
Work-unit commits explicitly authorized; parent commits only after observed checks/review.

## Architecture
Use a bounded native History API codec/adapter for the existing finite role/view contract; no new dependency or lock changes.
Keep setView and setRole signatures to avoid broad caller rewrites.
URL is the source of screen identity and supported durable IDs; React holds transient UI state.
Root / is role selection; /alumno/:view and /docente/:view select valid role-specific screens.
Classroom and conversation IDs may use /:role/aulas/:id and /:role/mensajes/:id.
Do not serialize initialPrompt, contactId actions, legacy title-based openTask payloads or private drafts into URL or history.state. Keep transient compatibility payload only in session memory; clear/reconcile on back/forward/reload to avoid stale context.
Role URL is UI mode, not authorization. ID existence/access checks remain feature-owned.
Activity-ID routes deferred until a consistent contract is confirmed.
Safe invalid-route fallback and canonical paths required. Server already has SPA fallback; verify it, do not rewrite it unnecessarily.

## Tasks
- [x] R1: URL codec, browser-history synchronization and existing App/setView/setRole compatibility with regression tests. Status: done; commit fc3ab57a37411c1fc9acf3f98c9041492fef8874.
- [ ] R2: Synchronize classroom and conversation detail entry/back/manual selection with durable URL IDs. Status: in_progress; three affected test surfaces explicitly approved; writer checks passed, independent verification pending.
- [ ] R3: Lazy page boundaries, loading/error feedback, tests and measured initial/route bundle sizes. Status: pending.
- [ ] R4: Independent types/tests/build/server deep-link verification, native review per work unit when enabled, browser coverage report and commits. Status: pending.

## Acceptance and checks
R1: RED then GREEN for role/view path matrix, encoded IDs, malformed/unsupported paths, initial hydration, history navigation, same-path payload handling, role switching, privacy (no prompt in URL/history state), listener cleanup and safe no-window fallback.
npm test must include src/app/tests/*.test.ts (currently excludes app tests). Preserve existing compile-time navigation checks; no legacy assertion weakening without behavioral replacements.
R2: direct load and selection/back stay consistent with URL; unauthorized conversation content stays hidden; invalid IDs safely fall back with canonical URL where needed. No new activity behavior.
R3: React.lazy declarations at module scope with named-export adaptation; Suspense and error boundary must preserve layout shell and settings/accessibility. Avoid eager page imports through barrels; no indiscriminate vendor chunking or memoization.
R4: npm run lint; npm test; npm run build; git diff --check. Independent verification and native per-candidate review. Existing node/SSR tests do not prove mounted browser transitions; report lack of browser runner honestly.
Build baseline: main JS 1,963.87 kB (gzip 514.13 kB), CSS 178.99 kB (gzip 22.76 kB); warning >500 kB.
Measure new entry dependencies, lazy/shared chunks, not only renamed chunks or total bundle sum; no numerical performance target without baseline runtime measurements.

## Evidence and decisions
Scout confirmed App state routing, eager layout page imports, existing dev/prod SPA fallback; historical bundle optimization cancelled.
MDN: pushState/replaceState do not emit popstate; manually update navigation snapshot and subscribe for traversal. State must serialize and URL must be same origin.
React official docs (Context7): declare lazy outside components; loader resolves default component; React caches load; Suspense handles pending, error boundaries handle rejected loads.
Sources: https://developer.mozilla.org/en-US/docs/Web/API/History/pushState ; https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event ; https://react.dev/reference/react/lazy

## Progress
R1 writer implemented URL codec/controller and thin useSyncExternalStore hook with App integration; package npm test includes app tests. Five files +411/-19. RED: 11 behavior assertions; GREEN: 13/13 routing, 337/337 full tests, types and diff check passed. No build or mounted browser verification claimed by writer. Independent verifier confirmed 13/13 routing, 337/337 full tests, lint/build/diff check passed; no concrete R1 regression. Native review-8d01de49d2163fff approved and exact acknowledgement burned authority; informational client-subscription coverage warning. Mounted browser/StrictMode integration remains unverified. R1 commit: fc3ab57a37411c1fc9acf3f98c9041492fef8874 — feat(navigation): drive role and screen selection from URLs.
Known-role invalid route canonicalizes to role dashboard; unknown role to root. Query/hash discarded. IDs reject dot segments and invalid UTF-16. Transient params remain memory-only and traversal clears them.
R2 scope mapped: optional push/replace public SetAppView mode; student/teacher classroom entry/back/invalid IDs; teacher transient task consumption retaining classroom ID; messaging wrappers/manual selection/mobile Back/access fallback. Replacements canonicalize without duplicate history entries; preserve legacy contactId and default conversation flows. No activity URL routes.
R2 partial implementation: 13 files +298/-45; eight intended RED failures, latest focused 39/39; lint/diff check passed. Full npm test 339/345 with six failures in historical student selection tests. Worker interaction_required requests three derived extra test paths: src/features/classrooms/tests/classroomComposition.test.ts; classroomStudentController.test.ts; classroomStudentMembership.test.ts. User selected Approve all for these exact three paths; writer may update equivalent route-driven regression coverage. Preserve test intent; no production scope expansion. R2 follow-up edited only approved three tests +175/-59; focused 20/20, full npm test 346/346, lint/diff passed. Independent R2 verification and native review next; no commit yet. Mounted browser/StrictMode lifecycle unverified.
Parent owns task record/mirror, scope decisions, commits and native review.
