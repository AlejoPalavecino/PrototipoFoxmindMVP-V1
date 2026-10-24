# Gemini400 real browser acceptance — passed

- Agent / task: /root/fix400_red, test_runner
- Persisted by: /root coordinator (tester has test-only write ownership)
- Date: 2026-10-24
- Starting commit: e6e0e0b plus pending schema repair
- Worktree / branch: classroom-gemini / codex/classroom-gemini
- Feature: [classroom AI](../../odd/tasks/classroom-ai-extraction.md)
- Status: completed for the functional checks below

## Scope and execution

User authorized repairing Gemini400 and repeating real PDF extraction, teacher editing, application and classroom creation. Browser owner resumed existing ego Space5 with explicit user authorization; no new Space. Used the corrected fresh API/Next runtime36307, origin http://127.0.0.1:55453, inbox http://127.0.0.1:56558, normal Gemini Developer adapter and model gemini-3.5-flash-lite. Provider was not replaced by a fake. The coordinator did not operate the browser concurrently.

## Observed results

- Registered one synthetic account, internally consumed its own Mailpit verification link, confirmed with keyboard and logged in within one script. Password existed only in process memory. No secret files read, credentials logged or private user account used.
- Created Fotografía · Gemini corregido, selected cover and uploaded plan-sintetico.pdf. Security approved the PDF. Automatic extraction reached READY without retry or manual generation request.
- Proposal contained two units: Unidad1: La luz and Unidad2: La camara, with Exposicion, Composicion, Apertura and Velocidad. These originated in Gemini, not manual fallback.
- Edited first unit to La luz — revisión docente, first topic to Exposición manual, and added Práctica de iluminación. Pressed Usar unidades revisadas. UI confirmed reviewed units saved and draft saved. Two units/five topics were present before publication.
- Final review and explicit Crear aula succeeded: Aula creada, ID37d3be3a-5141-45b1-8297-b9799df440c9, file3c518a3b-0fb9-470d-bd0a-d9737be7c760. Plan displayed all edits.
- A later reload redirected to sign-in and an initial API probe returned401. Cause is unknown; no unsupported bearer/expiry explanation or authentication-policy change. Recovered the same synthetic account, logged in and immediately reloaded successfully. The same classroom remained in the list; reopened Plan retained two units/five topics.
- Authenticated same-origin list and exact detail GET /api/v1/classrooms/37d3be3a-5141-45b1-8297-b9799df440c9 returned200. Whitelisted detail confirmed both names, all five topics and edits. No raw response credentials copied. Real token usage was not visible in these UI/API surfaces.

## Visual evidence and limits

Evidence folder: C:/Users/alejo/.codex/visualizations/2026/10/23/01a16946-df9f-7480-9ec1-7395f6c888b3/gemini400-fixed-browser. New rounds02–29 contain the observed workflow; desktop-editor-reviewed.png was captured and inspected by tester and coordinator. It shows both unit values and five topic values at1440×1200 without overlap/horizontal overflow. Initial desktop-proposal.png showed only editor bottom and is not full-content proof.

Final Plan capture was unavailable because the browser window was minimized; mobile was not executed. Window-restoration/selector/wait errors were driver limitations and did not trigger another extraction. A raw Alumnos snapshot accidentally included a synthetic classroom join code; it is not copied or persisted here. Full historical mobile/visual exit conditions are not claimed.

## Handoff

Space5 handOff succeeded, p1 on the created Plan; runtime36307 remains running for user. No source/test changes in this browser assignment, no extra accounts or provider retries, no cleanup or remote-publication claim. Functional real extraction→edit→apply→create→reopen/API persistence passed. Coordinator owns final documentation, review and local commits.
