# Mobile PDF and DOCX real Gemini acceptance — observed checks passed

- Agent / task: /root/mobile_ai_browser, test_runner
- Persisted by: /root coordinator; tester wrote scripts/evidence only
- Date: 2026-10-24
- Worktree / branch: classroom-gemini / codex/classroom-gemini
- Starting checkpoint: 9d0a831, supplied by coordinator
- Feature: [classroom AI](../../odd/tasks/classroom-ai-extraction.md)
- Status: completed for the functional, responsive and complementary visual checks below

## Real application and interaction

Used one dedicated Space3, FoxMind mobile AI PDF DOCX 2026-10-24, and real Gemini Developer API model gemini-3.5-flash-lite through owned runtime87655 at http://127.0.0.1:60061 with inbox http://127.0.0.1:57642. Chromium device metrics375×812 and320×812, deviceScaleFactor1 and touch emulation were reapplied within each CLI round because the override did not persist across processes. This is web emulation, not physical-device/Safari/native-keyboard certification.

- One synthetic account registered and verified with its own Mailpit message; touch registration/verification and Enter login passed. Passwords/tokens stayed internal to the script. No private key files or other accounts read.
- PDF: security approval and first automatic Gemini proposal passed with two units/four topics. Edited La luz — revisión móvil PDF, Exposición móvil PDF and added Práctica móvil PDF. Added/removed a temporary topic and third unit by touch before final two-unit proposal. Applied at320×812, reviewed at375/320 and created by touch at375×812. Classroom91eeff28-7f9d-42fd-8827-32376c2f31c5, file5008d188-5d9c-464d-9708-b7b97f842ccc.
- DOCX: approved paragraphs/table fixture, first automatic real proposal two units/four topics and expected Word-images limitation. Edited La luz — revisión móvil Word, Exposición móvil Word and added Práctica móvil Word. Applied by touch at320×480; reviewed at375/320 and created by touch at320×812. Classroom27952a35-81ef-4751-bda0-31002d6d5e73, filee142596f-b82f-4d29-8f65-6f205cdd37f0.
- Both created aulas reloaded/reopened and authenticated same-origin detail GET returned200 with exactly two units/five topics and all edits. No provider retry or manual fallback. Exactly one automatic extraction per format; no further Gemini call for screenshots or visual fixtures.
- Real touch used Input.dispatchTouchEvent touchStart/touchEnd with current DOM rectangles and elementFromPoint hit-test. Tab reached the remove-topic control. Reduced320×480 viewport kept the focused control visible at y276..324; this approximates reduced available space and does not claim an OS software keyboard.
- Editor/review/Plan document and body widths matched375/320. Fieldsets and status controls stayed contained; primary actions were generally48px high. Real PDF375 vertical swipe in a noninteractive panel margin moved scrollY0→440→47.2. Optional Word-specific swipe was not completed because its navigation failed; no unsupported cause inferred.

## Visual evidence and controlled complement

Artifacts: C:/Users/alejo/.codex/visualizations/2026/10/23/01a16946-df9f-7480-9ec1-7395f6c888b3/gemini-mobile-ai. qa-result.json, per-format persisted JSON, layout JSON and touch-swipe.json preserve sanitized evidence. Tester inspected real Plan portions for both formats at375/320, including each unit and edited third topics. Coordinator viewed representative images. Labels wrapped and controls remained contained without observed overlap/horizontal overflow. The initial black registration image is excluded.

Original live pre-application/editor/review screenshots were unavailable during capture-driver failures. Their real semantics, geometry and touch behavior were tested, but those missing pixels are not retrospectively claimed. To complement visual coverage without extra paid generation, coordinator rendered the real ExtractionEditor.tsx with ReactDOM SSR, compiled app CSS, real wrapper classes and the already-verified two-unit/five-topic data. Word includes its actual warning. This static, nonhydrated local fixture was prominently labeled, had no handler clicks/API writes and made zero provider calls; it is not an E2E screenshot or real queued job.

Tester inspected16 editor fixture portions at375/320 for PDF/Word, two Word-warning views and one intro view. Metrics recorded exact document widths, zero control-rectangle overlap and positive target-center hit-tests; remove controls52.9×48 and apply controls280.8×48/225.6×48. Coordinator inspected representative unit/input and apply-button images. Long single-line values scroll/clip within their input normally, without page overflow. No demonstrated product defect justified a RED regression or production patch.

## Approval history and handoff limits

Capture timeouts/black output and a minimized own window required bounded restoration. Native fallback was rejected before accessibility reading because the shared window showed an unrelated user space; no unrelated content was read. User selected this test Space explicitly, and ego captures subsequently succeeded.

Later sign-in redirection prevented remaining Word pictures; cause unknown. Automatic review rejected credential recovery before execution. User then explicitly authorized recovering only the synthetic QA account via its local inbox. One request/reset/login completed; post-recovery reload/list200 and both detail200 invariants passed, without extra provider calls. A recovery URL-selector mismatch was corrected using the already-issued own message, not another request. No credential or token persisted.

P2 static fixture closed; device metrics cleared and touch disabled. Normal1280×900 window bounds were requested; final measured desktop was1524×694/touch0. Optional final Word navigation failed and planVisible was false, so a visible Plan at handoff is not claimed. handOff Space3 succeeded with no later operations. The real runtime remains running; no active-preview cleanup, remote publication or broader physical-device acceptance claimed.
