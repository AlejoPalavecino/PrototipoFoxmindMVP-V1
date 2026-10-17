# P3 — Complete the local identity journey
Finish the existing P3.3 backend, then P3.4 screens and P3.5 integrated proof. Preserve all existing local changes, account contracts, local mail data and review authority; no publication or destructive data work.

Branch: feat/p33-token-flows; delivery: feature-branch-chain; runners: test-p33-t2 and test-p3-browser, plus focused web controls.

## Specs

S1. User request verbatim: "Vamos con la opción mas segura para terminar con P3".
S2. Current P3 roadmap scope: "implement registration, verification, sign-in/out, server sessions, password recovery and minimal profile. No exclusive global teacher/student role." Then: "Create the initial Next.js shell and corresponding registration/verification/sign-in/recovery/profile screens, including truthful loading/error states." Finally: "Verify the complete registration → captured email → verification → sign-in → profile → sign-out journey, plus rejected/reused/expired tokens and previous-session revocation after recovery."
S3. Existing functional specification and account API contract remain authoritative. Retain broad mailbox acceptance and uppercase-domain rejection, fixed local SMTP and encrypted transactional outbox; no .env/.env.example reads/edits, publication or destructive data rewriting.

S4. Current objective verbatim: "Bueno tu nuevo objetivo es cerrar P3 y terminar ahi" and "Te autorizo a que hagas todo lo necesario para cerrar P3". Finish P3 and STOP; no P4/P5 integration, publication, destructive data changes or sensitive-file access. Earlier session-only authorization and superseded P4 scope remain historical in the Log, not future authorization.

S5. User steering verbatim: "Para los sub agentes de Verify ocupa 6.1Sol en xhigh". Subsequent verification actors use gpt-6.1-sol/xhigh.

## Tasks

- P3-A | S1–S3 | T2 corrections/build-once/C3 verification and local closure | done | parent56PASS/build0/cleanup0, independent33PASS/no blockers, metadata9PASS+parent9PASS/structural114links7anchors. Commits273b339/21b9110/303c5cb/d6cc3fc/33bbd15/20cc033 observed. CurrentT2 explicitly natively unreviewed by human choice; wholeP3 incomplete.
- P3-B | S1–S4 | inline remaining backend/token/password operations; delegated independent risk2/4 verification | completed | backend99PASS includes recovery16/password11; fresh strict build and actual owned cleanup0. Commit8d04648ccff58e1c204efd87ca8d97cc62da685b.
- P3-C | S1–S4 | delegated disjoint parallel web unit; coordinator integration/correction | completed | actual Next build/types0, live web16PASS and real browser journeys. No mocks counted as integrated acceptance. Commit62e7c282db2d2762fc756aae1a6b5223fbbebeee.
- P3-D | S1–S5 | delegated gpt-6.1-sol/xhigh verification, items2/4/5 | completed | browser10PASS/0skip, rejection9/baseline7, audit0, final source equality and cleanup0; parent visual/type spot-check complete. Native review disabled/unmanaged. Commit08413fbd9382c9de42deeb05ae6d73303b503d6b.

- P4-A | S4 | explore/plan private-storage and scanner implementation | dropped | user changed objective to closing P3 and stopping; no P4 exploration/implementation performed or claimed.
- P4-B | S4 | implement/verify P4 file infrastructure | dropped | withdrawn from current scope, not completed; do not start P4 after P3.

## Log

L13. User steering verbatim: "Para los sub agentes de Verify ocupa 6.1Sol en xhigh". All subsequent independent verification actors use gpt-6.1-sol with reasoning_effort xhigh. The already active dependency installer is a tooling action and is not restarted. Full P3 scope and no P4/P5 integration remain unchanged.

L12. Active user objective: "Te autorizo a que hagas todo lo necesario para cerrar P3". Resume all necessary local implementation/diagnosis/verification without approval per technical transition. Scope still P3 only, no P4/P5 integration. Route: parent inline identity/password + root integration, parallel disjoint web unit delegated for parallelism, diagnostic action delegated to recover actual build proof. Final independent verification remains required for security/concurrency. Native off/global. Existing feature-branch-chain retained; mirror pending because Engram is unavailable.

L11. User answered "Si, te autorizo" to bounded Prisma diagnostic. One real generation child with original30s budget confirmed ETIMEDOUT/SIGTERM,30035ms; trace stopped during config-module startup. Underlying dependency/filesystem/environment cause remains unproven; no configuration/code correction or automatic retry. [Evidence](../../docs/work-log/2026-10-17-prisma-startup-diagnostic.md). P3-B blocked on required build proof; propose module-load-only diagnostic next. P3-C/D pending; no P4/P5 integration.

L10. Authorized synthetic5000ms correction independently rechecked1PASS; fresh build then exit1/30156ms with `Prisma generation: exit unavailable`, stderr empty, no TypeScript or runtime groups. [Report](../../docs/work-log/2026-10-17-recovery-recheck.md). P3-B blocked on unavailable fresh-build proof; no automatic budget increase/retry. Next proposed action is bounded generation diagnostic preserving30s. Native review switch observed off/global: disabled/unmanaged, no review lifecycle. P3-C/D remain pending, no P4/P5 integration.

L9. User: "Sí, autorizo ampliar solo ese límite de 2 a 5 segundos. Continuá con la verificación y completá P3, sin integrar P4 ni P5." Inline correction changes only synthetic cli timeout2000→5000. Independent targeted recheck plus four first executions pending. P3-B resumed; application budgets unchanged; no P4/P5 integration or native consent inferred.

L8. 2026-10-17 user: "Continuá con P3: corregí la preparación de la verificación independiente, completá lo que falta y cerrá P3. Terminá ahí, sin integrar P4 ni P5 todavía." Current coordinator [record](../../docs/work-log/2026-10-17-id-unavailable-p3-completion.md). Route: inline implementation; independent recovery verifier for risk items2/4. Corrected preparation succeeded88files/hashmatch/zero declarations valid. First prescribed pure command14PASS/1FAIL (synthetic child null status under2000ms), four remaining commands unrun. [Report](../../docs/work-log/2026-10-17-recovery-verify.md). New AGENTS decision gate retained; no automatic budget change/retry. Password-change tests/runner are syntax-checked drafts, no behavior implementation/RED/GREEN. Engram unavailable, mirror pending. P3-B remains blocked; P3-C/D pending. Existing local feature-branch-chain strategy retained. P4/P5 integration excluded.

L7. Recovery independent runtime verification is BLOCKED/PARTIAL: [attributed report](../../docs/work-log/2026-10-16-mvbovr28-p33-recovery-verification.md). Verifier's invented minimum declaration-file count stopped preparation1 before all five prescribed commands; no complete snapshot, application failure or independent acceptance. Parent88/build0/cleanup0 and self16/pure15 do not replace missing proof. P3-B blocked awaiting explicit human disposition; remaining password change/web/journey pending, accepted9 not11, P3 not complete, P4 remains dropped. No correction/retry/probe/source changes/publication performed after failure.

L6. User objective change verbatim: "Bueno tu nuevo objetivo es cerrar P3 y terminar ahi". Supersedes only the prior authorization to proceed into P4: close P3 and STOP. P4-A/P4-B dropped, never completed. Existing necessary P3 fixture8s allowance and backend/web/end-to-end checks continue; no publishing, destructive, sensitive-file or native consent inferred. Preserve earlier broader request/history without treating it as current permission.

L4. User request verbatim: "Te autorizo a que hagas todo lo necesarios para terminar todas las tareas necesarias para cerrar P3 y luego comenzar y cerrar P4. Te doy autorización a que solo por esta sesión puedas tomar las decisiones recomendables y seguras para hacer toda la implementación hasta el punto que te indique que es cerrar P4." Parent proceeds P3 then P4; session-only scope, independent/security/functional checks remain, existing no-sensitive-files/non-destructive/no-publishing/native-consent boundaries retained.

L1. User request verbatim: "Vamos con la opción mas segura para terminar con P3". Parent selects sequential work to reduce overlapping edits. This expands current goal to remaining P3, not P4 or publication. Backend and frontend are dependent units, not parallel writers.
L2. Prior runtime rejected both replacement parallel launches; no tasks created. Existing D2 and unfinished test files remain preserved. Prior failures/timeouts are not passing evidence. A context-backstop signal subsequently requires the next bounded implementation to be delegated; use one sequential C1 worker with exact allowed surfaces and surface any runtime rejection directly, without retry.

L3. User verbatim "si" authorizes proposed replacement of failing auxiliary receipt/cache with one strict build and sequential tests, retaining all functional checks. New plan odd/tasks/p33-build-once.md owns this replacement; old failed proof is preserved, never marked successful.
L5. T2 closed technically/independently/documentarily with observed per-unit local commits; original frozen metadata retained as historical not current. Next P3-B/T3 five endpoints, then P3-C web/P3-D end-to-end, then session-authorized P4. No publication/native approval/global review change.

Closure: backend8d04648, web62e7c28, browser/proof08413fb are observed local commits. Independent full P3 PASS and parent visual/types/offline/link checks complete. Native off/global. Retained inactive OS-temp copies after automatic cleanup denial are documented in docs/work-log/2026-10-17-p3-verify-final.md. Product work ends at P3; no P4/P5 integration or publication. Engram mirror unavailable.
