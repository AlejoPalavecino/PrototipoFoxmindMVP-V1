# Student submission and teacher feedback journey — verified locally

- Agent: root, sole implementer/reviewer; session identity unavailable, no memory writes or subagents.
- Start: clean main `abcfbab6c01acc0cc85972f5561876ebabaac97f`; branch `codex/student-journey-polish`.
- Date:2026-10-28. Status: completed.
- Scope: current user authorizes complete student classroom→activity→submission→teacher correction→student feedback verification and necessary fixes/polish. Use permanent synthetic demo actors and current warm design. Earlier main publication is completed, not blanket permission to publish this new work.
- References: [roadmap](../implementation-roadmap.md), [demo access](../local-demo-account.md), [P8 contract](../../odd/tasks/p8-grading.md), [previous visual refinement](2026-10-28-root-warm-product-polish.md).

## Execution plan and boundaries

Audit the actual browser journey, capture steps, preserve incomplete work and verify persistence/notification visibility from each role. Demo Biología supports principal-as-student and auxiliary-as-teacher; passwords remain in the user-provided context/protected local store, never copied to code/logs/evidence. This task authorizes synthetic submission/correction/publication needed to receive feedback; no real participants, reset/seed, provider charge, migration or deployment. Record exact synthetic mutations and leave useful completed demonstration results.

## Verification and handoff

## Findings and changes

- P7/P8 student journey: direct grade/feedback entry from submitted activity and grade notifications; selected attempt hides the redundant history list. Safe published result contains each answer once, shows grade/general feedback first, and retains submitted answers/files behind a disclosure while publication is pending.
- Removed the receipt's false unconditional “pending correction” claim. A successful questionnaire/practical submission followed by refresh failure now retains a receipt and prevents another submission; practical local state resets on attempt/epoch change.
- Clear, prominent explicit editing transfer above saved work, shorter save/submit guidance and accurate private/published teacher labels. No editor capability, scoring, authorization, publication or persistence contract changes.
- Warm feedback hierarchy, mobile spacing, consistent 24-hour notification/progress times, singular activity count. Existing images/logo retained; no generated assets needed.
- Owned source: Activities, AttemptSession, AttemptHistory, AttemptAnswers, QuestionnaireAttempt, PracticalAttempt, PublishedResult, GradingEditor, Notifications and Progress in `apps/classrooms-ui/`; shared `student-journey.css` and its workspace import. Tests: new `student-feedback-journey.test.mjs`, existing questionnaire overview loader repaired using the repository helper without weakening assertions.

## Actual authenticated proof

Ego Space19, existing web52171/API52170, permanent synthetic actors only. [Screenshots and step evidence](evidence/2026-10-28-student-journey/README.md).

1. Principal student entered Biología through Mis aulas→Plan→activity. Started the existing cell evaluation, wrote an answer, waited for autosave, closed/reopened and recovered the same answer. Explicit transfer, complete submission and on-time receipt succeeded.
2. Auxiliary teacher opened received submissions, saved 9/10 plus question/general feedback privately and reloaded that correction, then explicitly published. Principal received the new grade notification (unread3→2 after opening), saw the exact result and retained it after reentry/reload. Mi progreso showed1/1 delivered,1 on time,0 pending and average9.00; teaching-plan progress remained0/2.
3. Auxiliary student opened the existing Literatura practical assignment, uploaded synthetic `cuento-demo.pdf`, recovered the approved attachment after reopen, explicitly transferred editing and submitted on mobile. Before publication, the result showed pending with the submitted PDF accessible.
4. Principal teacher retrieved the PDF through the visible authorized download endpoint: HTTP200/application-pdf; SHA256 identical to the uploaded file (`64dac44815340cd9f38a3e97e810873bb8d7147574542c583086eda4bc2bb252`). Saved and explicitly published8.50 with feedback. Auxiliary received the notification and recovered grade/feedback/file again after a full reload. Principal login restored at end.
5. Final screenshots inspected at1440×1000,390×844 and320×844: no document/dialog horizontal overflow; grade appears around300px from viewport top. The long answer appears once. Resume and teacher publication screens also inspected at390px.

Synthetic mutations retained for exploration: one evaluation attempt/grade in Biología; one practical attempt/PDF/grade in Literatura; two grade notifications read by their recipients. No existing records deleted, no reset/seed/migration/provider calls. Existing Math attempt and unrelated classrooms/drafts preserved.

## Checks and honest limits

- RED: new five behavioral tests failed against the old UI; later practical refresh-failure regression failed separately. GREEN: all six new tests pass.
- Final command: `node --test tests/student-feedback-journey.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-autosave.test.mjs tests/p7-questionnaire-overview.test.mjs tests/p8-publication-client.test.mjs tests/p8-grading-client.test.mjs tests/p8-corrections-client.test.mjs tests/foxmind-3d-flows-attempt.test.mjs tests/p8-progress-client.test.mjs` →27 PASS,0 FAIL,0 SKIP.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json` →PASS. `node node_modules/next/dist/bin/next build .test-artifacts/education-production-build/apps/web` →PASS, including the final source; existing workspace-lockfile warnings retained. Isolated output uses shared-source junctions and the unchanged web page/config copy; it does not replace the running dev build.
- No API changes in this task, so no database migration or backend rebuild needed. Self-reviewed React hooks, scope, safe result DTO, explicit publication/transfer and focus behavior; no independent/native review claim.
- Initial overview test runner failed on a previously unsupported extensionless shared import; fixed the loader, same assertions now pass. A UI wait expected `9` instead of the server's canonical `9,00`; observation confirmed saved data and the script continued without replaying the save.
- A browser download-event wait timed out; no native download completion claim. Authorized browser fetch proved the exact PDF bytes instead. Dev HMR reset navigation during concurrent edits twice; fresh observations/reentry recovered. A cached CSS update was resolved by rebuilding its import; final screenshots show the current rule.
- An optional second local server launch was rejected by automatic tool policy (`blocked by policy`, no further reason). No alternate launch attempted; actual interactive checks used the existing authorized preview. Production compilation passed, not a separately served-production journey.
- Concurrent student-AI work appeared after this task began (ClassroomView, StudentAiSummary, API/domain/schema/tests and other records). Preserved and excluded from this task's commit; its transient JSX error disappeared after that worker's edit. Global whitespace warnings in its API files are not this task's changes. Do not claim the shared checkout is clean or its new AI feature verified.
- Physical mobile devices/Safari, all possible question types and broader historical P8/P9 acceptance remain outside this bounded new proof. No push/deployment.

## Commit and handoff

Local commit pending the final task-scoped diff/secret check; record its observed identity in the closing response. Rollback: this commit's listed UI/tests/styles/docs only, without undoing synthetic demonstration records or concurrent student-AI work. The requested journey is complete; later main integration/publication requires its own current scope and verification of concurrent work.
