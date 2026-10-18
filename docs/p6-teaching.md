# P6 teaching organization

P6 is in progress on codex/p6-teaching from accepted main a75deae. No P7 implementation or production deployment. [Tasks](../odd/tasks/p6-teaching.md), [coordinator](work-log/2026-10-18-root-p6-teaching.md).

## Plan transport and invariants

The existing classroom host/session/CSRF/admission and original InvitationService DI identity are preserved. `POST /api/v1/classrooms/:classroomId/plan` accepts exactly `{revision, operation}`. A fresh classroom detail supplies the revision. Every mutation requires the current verified teacher and a nonarchived classroom, locks the existing user/classroom boundary and increments that shared revision.

Operations: addUnit(name),addTopic(unitId,name),renameUnit(id,name),renameTopic(id,name),reorderUnits(ids),reorderTopics(unitId,ids),setTopicState(id,status),deleteUnit(id,confirm:true),deleteTopic(id,confirm:true),appendVersion(fileId); each operation additionally carries its action string. Reorders contain every existing ID exactly once. States are PENDING,NEXT,TAUGHT; choosing NEXT resets the previous NEXT to PENDING; marking TAUGHT selects no replacement. Topic deletion requires PENDING and no material/activity links; unit deletion requires empty/unlinked; no cascade. Names retain existing120character server validation.

New plan uploads use the same P4 classroom plan scope and complete safety/custody gates. appendVersion requires a ready same-classroom plan-purpose file and creates the next serialized version; old versions remain downloadable. It cannot change academic records or replace bytes. The current Plan UI provides management only for the current teacher outside archived state, explicit delete confirmation, truthful file-review status and stale-state reload. A successful file upload alone does not publish a new version.

## Observed checks and remaining acceptance

Own meaningful Plan RED7 missing changePlan then fresh APIbuild0/GREEN7 with owned SQLcleanup0; earlier malformed fixture preparation failures remain in the coordinator log. Both Next and standaloneUI strict TypeScript0; P5 host/HTTP/session/proxy/client24PASS. These are implementation/self-check evidence, not final full-P6 browser/version acceptance. Real P6 journeys, affected regressions and fresh independent Sol/xhigh remain pending. Nativeoff/global, disabled/unmanaged; no native approval claimed.
