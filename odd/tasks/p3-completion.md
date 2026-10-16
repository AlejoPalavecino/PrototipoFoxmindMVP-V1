# P3 — Complete the local identity journey
Finish the existing P3.3 backend, then P3.4 screens and P3.5 integrated proof. Preserve all existing local changes, account contracts, local mail data and review authority; no publication or destructive data work.

## Specs

S1. User request verbatim: "Vamos con la opción mas segura para terminar con P3".
S2. Current P3 roadmap scope: "implement registration, verification, sign-in/out, server sessions, password recovery and minimal profile. No exclusive global teacher/student role." Then: "Create the initial Next.js shell and corresponding registration/verification/sign-in/recovery/profile screens, including truthful loading/error states." Finally: "Verify the complete registration → captured email → verification → sign-in → profile → sign-out journey, plus rejected/reused/expired tokens and previous-session revocation after recovery."
S3. Existing functional specification and account API contract remain authoritative. Retain broad mailbox acceptance and uppercase-domain rejection, fixed local SMTP and encrypted transactional outbox; no .env/.env.example reads/edits, publication or destructive data rewriting.

S4. Current objective verbatim: "Bueno tu nuevo objetivo es cerrar P3 y terminar ahi". Finish P3 and STOP; P4 exploration/implementation is outside this task. Earlier session-only safe technical decision authorization remains bounded to P3 in session01a14539-ab7b-77dc-8eee-546a8c3dd168, not future-session permission, publication, destructive data changes, sensitive-file access or native-provider consent. Earlier broader request is retained verbatim in LogL4 as superseded history.

## Tasks

- P3-A | S1–S3 | T2 corrections/build-once/C3 verification and local closure | done | parent56PASS/build0/cleanup0, independent33PASS/no blockers, metadata9PASS+parent9PASS/structural114links7anchors. Commits273b339/21b9110/303c5cb/d6cc3fc/33bbd15/20cc033 observed. CurrentT2 explicitly natively unreviewed by human choice; wholeP3 incomplete.
- P3-B | S1–S4 | implement/verify remaining P3.3 token/password endpoints | in_progress | confirmation/resend passed parent72/realbuild and independent41/freshbuild/cleanup0/no blockers. Corrected178input snapshot includes schema/allmigrations, original147filepartial/4s failures retained. F404a94a/proofc81b810/core2fecee9/orchestration769db2f observed; passive9of12 checkpoint closure in progress. Recovery request/confirmation,password change/web/journey unfinished. Native unavailable/notapproved/notwaived; P4 dropped for this coordinator, not completed.
- P3-C | S1–S3 | implement P3.4 initial web shell/screens against verified API | pending | depends on P3-B; dependency decisions/installation separately validated; commit pending.
- P3-D | S1–S3 | P3.5 isolated end-to-end journeys and security/error cases; independent verification/applicable review and reconciled handoff | pending | depends on P3-C; commit pending.

- P4-A | S4 | explore/plan private-storage and scanner implementation | dropped | user changed objective to closing P3 and stopping; no P4 exploration/implementation performed or claimed.
- P4-B | S4 | implement/verify P4 file infrastructure | dropped | withdrawn from current scope, not completed; do not start P4 after P3.

## Log

L6. User objective change verbatim: "Bueno tu nuevo objetivo es cerrar P3 y terminar ahi". Supersedes only the prior authorization to proceed into P4: close P3 and STOP. P4-A/P4-B dropped, never completed. Existing necessary P3 fixture8s allowance and backend/web/end-to-end checks continue; no publishing, destructive, sensitive-file or native consent inferred. Preserve earlier broader request/history without treating it as current permission.

L4. User request verbatim: "Te autorizo a que hagas todo lo necesarios para terminar todas las tareas necesarias para cerrar P3 y luego comenzar y cerrar P4. Te doy autorización a que solo por esta sesión puedas tomar las decisiones recomendables y seguras para hacer toda la implementación hasta el punto que te indique que es cerrar P4." Parent proceeds P3 then P4; session-only scope, independent/security/functional checks remain, existing no-sensitive-files/non-destructive/no-publishing/native-consent boundaries retained.

L1. User request verbatim: "Vamos con la opción mas segura para terminar con P3". Parent selects sequential work to reduce overlapping edits. This expands current goal to remaining P3, not P4 or publication. Backend and frontend are dependent units, not parallel writers.
L2. Prior runtime rejected both replacement parallel launches; no tasks created. Existing D2 and unfinished test files remain preserved. Prior failures/timeouts are not passing evidence. A context-backstop signal subsequently requires the next bounded implementation to be delegated; use one sequential C1 worker with exact allowed surfaces and surface any runtime rejection directly, without retry.

L3. User verbatim "si" authorizes proposed replacement of failing auxiliary receipt/cache with one strict build and sequential tests, retaining all functional checks. New plan odd/tasks/p33-build-once.md owns this replacement; old failed proof is preserved, never marked successful.
L5. T2 closed technically/independently/documentarily with observed per-unit local commits; original frozen metadata retained as historical not current. Next P3-B/T3 five endpoints, then P3-C web/P3-D end-to-end, then session-authorized P4. No publication/native approval/global review change.
