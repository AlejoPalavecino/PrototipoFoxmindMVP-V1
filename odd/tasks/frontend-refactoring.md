# Frontend refactoring with mock data

## Objective and rationale
Preserve existing FoxMind UX and mock behavior while improving feature cohesion, dependency boundaries and future backend replaceability. Current classroom, messaging and study modules mix UI, operations and mutable data.

## Scope and constraints
- Frontend architecture, feature-owned mock adapters, focused tests, typed navigation and accessibility/settings composition.
- No backend/database, real authentication, new AI integration or visual redesign.
- Preserve fixture semantics, cross-role behavior and current persistence characteristics.
- Single writer; delegate nontrivial implementation and command verification.
- User explicitly authorized the initial snapshot and verified local work-unit commits on a refactoring branch. No push, PR or publication authorized. Project-only git init completed.
- User-owned RDD is on. Follow native review continuations for source candidates; no review result grants delivery authority.
- Characterize existing behavior before structural changes. Use observed RED/GREEN for actual behavior changes where meaningful; structural refactoring uses passing characterization tests before/after.

## Delivery and routing
Delivery strategy: ask-on-risk. Forecast: likely over 400 authored changed lines across the feature; exact slice estimates pending baseline/mapping. Moved files inflate diff; split by coherent functional flow, not by file category. No publishing is authorized. Local commit authorization granted; resolve applicable delivery strategy before oversized feature commits.

## Tasks
- [ ] T1 Establish runtime/typecheck/build baseline and identify browser/test capabilities. Route: delegated verifier; command verification trigger.
- [ ] T2 Add characterization tests and migrate classroom submission pilot plus cross-role theme helper. Route: bounded worker; multi-file trigger. Derive exact edit surfaces before dispatch.
- [ ] T3 Migrate remaining classroom flows and mock ownership in bounded subunits. Route: bounded workers, sequential.
- [ ] T4 Separate messaging persistence, operations, UI and invitation enrollment coordination. Route: bounded workers, sequential.
- [ ] T5 Modularize study tools, local state and mock operations. Route: bounded workers, sequential.
- [ ] T6 Type app navigation and separate app settings/composition; share layout only where justified. Route: bounded workers.
- [ ] T7 Enforce dependency rules and document extension points. Route: bounded worker.
- [ ] T8 Run final typecheck/build/tests and browser checks of critical flows. Route: delegated verifier.

## Acceptance
- Existing mock-backed flows and current persistence behavior retained.
- Migrated UI does not directly import mutable fixtures or access localStorage.
- No role screen imports another role screen for reusable logic.
- Shared domain data has explicit owner; cross-feature operations use public boundaries.
- App navigation payloads typed, ephemeral UI state local.
- Functional checks pass or explicitly documented baseline/environment blockers remain unresolved.

## Progress and evidence
- Preflight: ancestor C:/.git caused dubious ownership; project had no .git. User authorized project-only git init. Exact root now resolves; no global config changed.
- Runtime: Node v24.20.0; npm 12.0.2. `npm ci --ignore-scripts --no-audit --no-fund` succeeded (344 packages).
- Baseline: `npm run lint` passed (tsc --noEmit); `npm run build` passed (frontend + server). No source mutations; verifier SHA256 snapshots matched across 104 project files.
- Nonblocking baseline warnings: deprecated node-domexception@1.0.0; JS chunk 1953.18 kB minified / 508.06 kB gzip exceeds 500 kB advisory.
- No configured tests/runner or browser automation exposed. Chrome/Edge exist; no visual checks performed.
- T1 verification completed; user authorized initial snapshot and subsequent verified local work-unit commits. Safe baseline inclusion and exact T2 surfaces being mapped read-only.
- Commit evidence: none yet; safe baseline scan pending.

## Next step
Read baseline safety/pilot mapping, create initial snapshot and refactoring branch, then execute bounded characterization/pilot slice. Resolve oversized delivery strategy before feature commits.
