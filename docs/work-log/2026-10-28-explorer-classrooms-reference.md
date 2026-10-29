# Mis aulas reference — exploration completed

- Agent / role: /root/explorer, read-only bootstrap; persisted by /root.
- Task ID: /root/explorer.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; isolated foxmind-inicio-astra.
- Starting commit: f0dc59a5d94558e97dd7b203e359d183be27923b; clean tree observed during inspection.
- Phase/task: [Mis aulas reference](2026-10-28-root-classrooms-reference.md), existing P5 collection and foxmind-3d-migration feature context.
- Status: completed.

## Inspection and findings

Read instructions, roadmap/protocol, relevant navigation spec and feature context, route/gate, Classrooms composition, ClassroomCollection, collection-filter, API DTO, Cover/catalog, CSS and component fixtures/tests. Viewed the selected reference. Engram current/context/search reads completed; no writes or historical authorization reuse.

Collection supports name/subject/division search using NFKC/lowercase/trim, global role counts and stable ID deduplication with teacher DTO precedence. Teacher is available for new local search; archived, academicYear and division permit local filters. Grid/list is a new local presentation control. No list DTO pagination/cursors, progress percentages, roster/avatars, weekly schedules or card action menu exist. Academic year means Ciclo lectivo, not school grade.

Create posts a draft and opens the existing wizard. Join explicitly previews a code before confirmation. Enter uses the real classroom ID. Pending work comprises invitations and private drafts, preserving expiration, URL-selected invitation priority, acceptance and continuation. Archived label must remain read-only. Cover uses existing category/fallback assets. Retain real navbar destinations; do not add unsupported global links from the mockup.

## Verification and handoff

No test/build/browser/server/DB/secret/publication or file/commit operations by this read-only agent. Actual source paths located after two unsuccessful guessed/glob paths; no functional failure inferred. Suggested focused collection/client checks require normal dependency inspection before execution. Initial fixtures can be extended with synthetic pending work and controlled responses, without a backend.

Next: architect defines optional local controls; worker implements scoped composition; test_runner verifies collection behavior, create/join staging and responsive states. Coordinator persists evidence and handles local commits.
