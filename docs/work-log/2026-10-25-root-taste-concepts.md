# Taste-guided platform exploration — five new concepts

- Agent / role: /root, sole coordinator/author for continuity with this design request.
- Session or task ID: /root; additional runtime identity unavailable.
- Date: 2026-10-25, America/Buenos_Aires.
- Branch / worktree: main, canonical directory; existing untracked design records preserved.
- Starting commit: 727614d (previously verified; unchanged source context).
- Phase and detailed task/spec links: visual exploration; [functional specification](../foxmind-v1-functional-spec.md).
- Status: completed (five visual concepts; selection pending).

## Request and scope

User explicitly invoked design-taste-frontend and requested five more original, engaging and pleasurable design ideas. Continue three-screen scope: Inicio, Mis aulas, classroom interior per concept. Preserve Foxy/orange and brand palette; varied school subjects, playful experience, no photography-only framing. This is raster ideation, not frontend implementation or permission to run/deploy the app.

## Subject/data inventory

1. FoxMind name combines an expressive orange fox with learning/curiosity.
2. Actual Foxy has orange fur, cream muzzle/chest/tail, brown details and expressive ears.
3. Brand source tokens contain orange, mint, coral, yellow and lavender on white with dark ink.
4. One account can study and teach in different classrooms.
5. Estudio and Enseño coexist; there is no global role switch.
6. Classroom identity supports any school subject, including Matemática, Literatura and Biología.
7. Course plans contain units and topics, not assumed prerequisites or personal mastery.
8. Materials have filenames, covers/previews and subject-specific content.
9. Activities and submissions are concrete learning work, not vanity dashboard KPIs.
10. Teacher management and student read-only plan have different controls.
11. Global Inicio/Mis aulas/Agenda must stay recognizable.
12. Foxy can accompany the content at a modest scale rather than occupy a repeated greeting banner.

## Questions and direction choices

Inicio: what work should I open next? Mis aulas: where do I study or teach? Interior: which unit/material/activity belongs here?

Read taste-skill SKILL.md (user supplied) and the app-screens reference. Executed real draw.mjs --app choices and five direction sheets with --keep palette, home/list/detail. Selected three compatible style families and five different product-specific devices, rather than assuming five generic style IDs equal five original experiences:

| Concept | Sheet | Seed | Product-specific device |
|---|---|---|---|
| Gabinete de hallazgos | framed-sheet | 302360048 | Classroom/material collection opens into a readable exhibit and detail pane |
| Hilo de curiosidad | accent-ladder | 838149941 | Foxy's orange tail suggests a content spine through course/unit/material hierarchy |
| Dos miradas | editorial-greeting | 958601110 | Simultaneous learner/teacher perspectives organize the page as two continuous lanes |
| Preguntas que abren | framed-sheet | 1218508034 | Actual activity questions and study diagrams are the visual focus |
| Folio vivo | editorial-greeting | 1693821981 | Course objects and topics become an editorial index and contiguous study folio |

Sheets are under .taste-skill/foxmind-concepts-oct25/<gabinete,trama,dos-miradas,preguntas,folio>/direction.json. Folio had one shell redraw: the reading/index use suggested more shared reading space; the returned alternative was tinted-frame/white-sheet, and that returned shell was used. Other sheets were not redrawn. Library list/detail patterns are absent and expressly allow composition from app rules. Omitted the sample home KPI tiles because the actual task has no relevant KPI question. Prompts requested neutral navigation, purposeful hierarchy, flat surfaces, meaningful material images and one primary. User's explicit playful brand/character request takes precedence over strict tiny color-share budgets for illustrations. Actual outputs are not claimed to satisfy every numeric/style constraint: several retain tinted navigation and multiple orange controls. Supplied palette lavender is a preserved brand choice, not an invented primary accent.

## Work and verification

Node v24.20.0. Read commands and all five draw commands exited 0 and returned saved sheets. No app server, browser inspector, mobile behavior or interactive checks apply to this image-only exploration; no such PASS is claimed. Final images require visual inspection for all three requested surfaces and content coherence. Relevant execution data are synthetic subject/material examples, not student data.

## Commits and outcomes

Five independent built-in image_gen calls returned five visible boards, each showing all three requested screens. Actual display order and filenames in C:/Users/alejo/.codex/generated_images/01a1706d-c32f-7613-bd26-6aeec3c93e6d/:

1. Gabinete de hallazgos — exec-44ece314-5e73-4412-9e4c-e94ad41b3a88.png.
2. Hilo de curiosidad — exec-81de601a-30f3-466e-9516-146a19fa8387.png.
3. Dos miradas — exec-cf2ad207-2c7c-42fe-aab1-797d2d64a8e9.png.
4. Preguntas que abren — exec-81e09765-23fe-430a-9091-0e31267669cd.png.
5. Folio vivo — exec-e7738097-fdc7-4a9c-9bff-8fae7b02e41e.png.

All prompts used the actual foxy-welcome.png as a mascot reference and brand palette from prior verified tokens. Boards are preview-only; the app does not consume them. Full prompt intent is the subject inventory, screen content invariants and five face/signature decisions above. No subagent work was dispatched during this continued exploration.

## Visual assessment and limits

Coordinator inspected all generated results directly. Each includes Inicio, Mis aulas and interior; course names/roles are recognizable and vary by subject. No functional/browser/mobile validation claimed. These are directional raster mocks, not verified design-system implementations.

- Gabinete: material specimens give the courses identity; fox/foliage repeats too strongly in sidebar, entry buttons compete, pastel containers remain conventional.
- Hilo: strongest distinctive continuity from course to unit/material; tidy hierarchy/detail pairing; path must have a linear mobile fallback, no implied prerequisite semantics. Repeated primary activity could be consolidated.
- Dos miradas: concurrent Estudio/Enseño communicates the real account model; teaching interior coherent. Some nested panels/illustration repetition exceed intended restraint.
- Preguntas: actual literary question is a stronger entry point than a generic greeting; material preview supports the purpose. Some tinted icon containers/navigation remain outside house rules.
- Folio: typographic index and contiguous reading improve variety; bookmark signature visible. Generated serif use extends beyond the requested single greeting role.

Generated mathematical illustrations/labels in this set contain inconsistencies and are NOT validated teaching material; replace or correct them before any prototype reuses them. Mock prose, material names, page counts, source covers and all account initials are sample content, not product facts. Browser lint/inspect and numerical style scores would be misleading for these image-only deliverables and were not claimed. The next iteration must correct the identified specific issues in the chosen direction instead of treating images as implementation-ready.

No implementation, commits or publication. git diff --check exited 0 for tracked changes; new records and local direction artifacts remain uncommitted. Earlier two design records preserved. Engram writes were already unavailable in this chat; no blind repeated write or new persistence success claimed.

## Handoff

User chooses or refines using this set's actual display order. Hilo de curiosidad is the provisional coordinator recommendation for the most distinctive content organization; no user selection or approval yet. Correct noted mock-content/style issues in the selected concept before making a functional prototype; do not infer implementation consent from visual selection alone.
