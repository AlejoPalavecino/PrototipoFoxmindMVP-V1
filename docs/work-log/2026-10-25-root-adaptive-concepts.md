# Adaptive-role visual concepts — five alternatives

- Agent / role: /root, sole coordinator/author.
- Session or task ID: /root; additional runtime identity unavailable.
- Date: 2026-10-25, America/Buenos_Aires.
- Branch / worktree: main, canonical directory.
- Starting commit: 727614d, freshly observed.
- Phase and detailed task/spec links: design exploration; [current functional specification](../foxmind-v1-functional-spec.md).
- Status: completed (visual ideation only).

## Request and accepted design direction

User accepted adaptive information presentation and requested five new visual ideas based on it. Generate three screens per concept: Inicio, Mis aulas, classroom interior. Show student-only, teacher-only and mixed participation contexts across the alternatives while maintaining Foxy/orange, varied subjects, originality and the taste-guided approach.

The accepted design proposal changes the previous always-visible dual-group presentation: only students see direct classrooms and study tasks; only teachers see direct classrooms and teaching tasks; mixed accounts see task groups Para entregar/Para revisar and classroom groups Aulas donde estudio/Aulas donde enseño. New accounts have two clear first actions. This is membership-driven presentation, not a permanent account role, global role switch or server permission change. It is accepted design direction only; no implementation requested and no runtime/spec migration performed.

## Work performed

Reconciled actual main/HEAD and existing untracked design work; preserved it. Reused previously read taste app rules and character/token evidence, and generated five fresh draw.mjs --app sheets under .taste-skill/foxmind-adaptive-oct25/. Same actual Foxy character reference for all image prompts. Plans: Impulso (student), Mesa docente (teacher), Atlas cercano (student), Estudio abierto (teacher), Ritmo propio (mixed). Each is a visual system that can adapt to the other contexts; pictured persona is a demonstration, not a product restriction.

## Verification

Read/Git commands and five draw.mjs --app invocations exited 0. All five generated boards were visually inspected: each includes Inicio, Mis aulas and an interior classroom view. The first four demonstrate single-context accounts without redundant role groups. Ritmo propio consistently depicts two studied classrooms and one taught classroom, with student controls in its literature interior. No global role switch appears. Illustrations use covers/excerpts/academic objects rather than numerical teaching diagrams.

Observed concept limitations: image generation retained some decorative gradients, repeated foliage, tinted icon boxes and larger Foxy illustrations despite the restrained prompt. Atlas cercano's directory is more regular than the requested staggered composition. Impulso contains minor generated text artifacts; Ritmo propio labels the first classroom tab Inicio instead of Plan and has a small Entrar label typo. These are unimplemented raster proposals, not approved exact UI copy or an accessibility/interaction baseline. New-account empty state was described in the design direction but is not pictured in this five-board scope.

Final git diff --check exited 0 with no tracked product diff. Separate local verification exited 0: five recorded image files exist and are nonempty, five direction sheets parse as JSON, the functional-specification link resolves and this record has completed status. No app server, browser or functional tests: the deliverables are image-only proposals. No accessibility or browser-interaction proof claimed.

## Commits and outcomes

Five boards generated and displayed inline. Each has three screens (15 screen proposals total). Files are retained under C:/Users/alejo/.codex/generated_images/01a1706d-c32f-7613-bd26-6aeec3c93e6d/:

| Concept | Demonstrated participation | Image filename |
| --- | --- | --- |
| Impulso | Student only; next activity and feedback | exec-cd873962-b430-4348-ba07-2e0b5b974463.png |
| Mesa docente | Teacher only; submission review | exec-f76a3d1f-5f21-40bc-bee7-4a7910002e16.png |
| Atlas cercano | Student only; subject identity and materials | exec-a391bb7c-8a98-4be0-b361-198ab383a659.png |
| Estudio abierto | Teacher only; class preparation and plan | exec-99a9a5f1-6c65-4507-945f-8f293e964ca9.png |
| Ritmo propio | Mixed; task and classroom groups by participation | exec-9cbcdbe7-91f5-40c5-a294-a0b09232bb69.png |

No product changes, commits or publication. Prior records preserved. No agent-attributed Engram writes attempted: runtime registration unavailable; repository record retains the outcome.

## Handoff

Next exact action: user selects a visual direction or combination, then refine its three screens across student-only, teacher-only, mixed and new-account states within the subsequently requested scope. Preserve accepted adaptive presentation. No visual direction has been selected yet; no phase/roadmap completion or product implementation is implied.
