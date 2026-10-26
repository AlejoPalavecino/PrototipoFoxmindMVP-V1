# FoxMind 3D — single-participation home examples

- Agent / role: /root, direct visual design.
- Session or task ID: unavailable; descriptive collision-free filename used. Agent-attributed memory writes remain disabled.
- Date: 2026-10-25.
- Branch / worktree: main, shared original checkout.
- Starting commit: e7f5d6f.
- Phase and detailed task/spec links: visual exploration only; [functional specification](../foxmind-v1-functional-spec.md) sections 2 and 4, [Agenda](../agenda.md), [selected six-screen proposal](2026-10-25-root-3d-six-screen-system.md).
- Status: completed.

## Request and scope

Show how the selected FoxMind 3D experience greets a teacher who only teaches and a learner who only studies. Generate two standalone Inicio mockups and explain how relevant content changes. These are classroom-membership-derived examples, not exclusive global account roles or a permanent role switch. No product implementation or publication.

## Work performed

- Read roadmap, work-record protocol, confirmed roles/navigation/notifications and image generation instructions.
- Inspected branch/HEAD and tracked working tree: main/e7f5d6f, no tracked changes.
- Use final selected Inicio as a style/layout reference. Continue the proposed left sidebar even though the current functional specification describes top navigation: this is a new visual proposal, not a claim about shipped UI.
- Teacher example prioritizes reviewing classroom submissions, recent classroom queries, personal agenda and scoped teaching shortcuts. Learner example prioritizes own activities, feedback, learning materials and personal/academic agenda. Neither includes an irrelevant empty role section.
- Generated and directly reviewed two separate images using the built-in image generator. Same selected sidebar, Foxy, palette and dashboard hierarchy in both.
- Teacher fixture: 8 + 4 pending submissions = 12, two classroom queries, miniagenda with personal class events and an academic closing deadline, three classroom links. Create activity/upload material/publish notice shortcuts explicitly target the displayed classroom selector.
- Learner fixture: two pending activities with matching miniagenda deadlines (26/27 October), separate Mathematics feedback, Biology reading resource and relevant shortcuts. No teacher workflow appears.
- In a single-participation account, the proposed directory has one card grid without empty Estudio/Enseño grouping; if both memberships exist, grouped context becomes useful. Joining/creating a classroom remains permitted under the account model, without forcing an exclusive role.

## Outputs

- Teacher Inicio: `C:/Users/alejo/.codex/generated_images/01a1706d-c32f-7613-bd26-6aeec3c93e6d/exec-fa505eaa-1d12-4a70-9f27-2e0546f95c08.png`.
- Learner Inicio: `C:/Users/alejo/.codex/generated_images/01a1706d-c32f-7613-bd26-6aeec3c93e6d/exec-1ff487df-1fea-48ec-bd48-6c14f58d87ba.png`.

Both are preview-only visual explorations displayed inline; no project asset is consumed from these paths by application code.

## Verification

- Read-only PowerShell/rg and Git commands succeeded.
- Both generated screens were inspected: role-relevant sections, fictional data, exact queue totals, classroom scoping and exclusion of irrelevant role sections are visible. Neither includes a global role selector.
- `Get-Item -LiteralPath <two output paths> | Select-Object Name, Length` returned both PNGs nonempty (1,605,443 and 1,659,745 bytes), exit 0. Closing Git branch/HEAD/tracked-status check returned main/e7f5d6f and no tracked changes, exit 0.
- No functional tests needed for preview-only raster proposals. No browser, responsive, interaction or full accessibility verification claimed.
- These screens depict populated memberships, not first-use, empty/error/loading states or a permanent role assignment. Classroom/directory adaptations are described, not separately rendered in this scoped follow-up.

## Commits and outcomes

No commit, push, deployment, source change or Engram write performed.

## Handoff

Completed both requested entry experiences. Next work depends on user design feedback; preserve this membership-based adaptation in any later implementation and separately define first-use and responsive states. No implementation/publication authorization inferred from these examples.
