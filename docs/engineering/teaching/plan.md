# P6 teaching organization

P6 is completed and published to main via remotely confirmed merge8eee463, preserving accepted baseline a75deae. That P6 slice did not implement P7; later P7–P9 acceptance is recorded in the [main roadmap](../../implementation-roadmap.md). No production deployment is claimed. [Tasks](../../../odd/tasks/p6-teaching.md), [coordinator](../../work-log/2026-10-18-root-p6-teaching.md).

## Plan transport and invariants

The existing classroom host/session/CSRF/admission and original InvitationService DI identity are preserved. `POST /api/v1/classrooms/:classroomId/plan` accepts exactly `{revision, operation}`. A fresh classroom detail supplies the revision. Every mutation requires the current verified teacher and a nonarchived classroom, locks the existing user/classroom boundary and increments that shared revision.

Operations: addUnit(name),addTopic(unitId,name),renameUnit(id,name),renameTopic(id,name),reorderUnits(ids),reorderTopics(unitId,ids),setTopicState(id,status),deleteUnit(id,confirm:true),deleteTopic(id,confirm:true),appendVersion(fileId); each operation additionally carries its action string. Reorders contain every existing ID exactly once. States are PENDING,NEXT,TAUGHT; choosing NEXT resets the previous NEXT to PENDING; marking TAUGHT selects no replacement. Topic deletion requires PENDING and no material/activity links; unit deletion requires empty/unlinked; no cascade. Names retain existing120character server validation.

New plan uploads use the same P4 classroom plan scope and complete safety/custody gates. appendVersion requires a ready same-classroom plan-purpose file and creates the next serialized version; old versions remain downloadable. It cannot change academic records or replace bytes. The current Plan UI provides management only for the current teacher outside archived state, explicit delete confirmation, truthful file-review status and stale-state reload. A successful file upload alone does not publish a new version.

## Observed checks and remaining acceptance

Own meaningful Plan RED7 missing changePlan then fresh APIbuild0/GREEN7 with owned SQLcleanup0; earlier malformed fixture preparation failures remain in the coordinator log. Both Next and standaloneUI strict TypeScript0; P5 host/HTTP/session/proxy/client24PASS. These are implementation/self-check evidence, not final full-P6 browser/version acceptance. Actual P6 own journeys now passed15leaf/18TAP across separate runs, affected P5 integrated13real+16controlled/isolated46, P4integration9 and P3browser10 passed. Historical preparation failures remain attributed in the own-check record; the monolithic P6 runner has not yet passed as one command. Independent Sol/xhigh full behavior/conservation proof and the bounded exact-byte mobile correction recheck are accepted; see [final evidence](../../work-log/2026-10-18-p6-verify-final.md). The initial monolithic API-budget failure and first Windows archive preparation limitations remain explicitly attributed, not relabeled global PASS. Nativeoff/global, disabled/unmanaged; no native approval claimed.

## Complete P6 guides and local proof

See [Library](library.md), [Muro and notifications](wall.md), [own checks](../../work-log/2026-10-18-p6-own-checks.md). Run `npm run test:p6:integration` for fresh API/production Next builds and real Plan/Library/Muro journeys in disposable services. `--help` has no fixture side effects. The new runner retains API30s/Next180s and gives each real P6 journey330s with child360s; no P7 authoring. Tests honor actual server Retry-After once through the existing visible retry control instead of disabling rate admission. Linux-mounted FreshClam configuration is pinned to LF, preserving security freshness.

The runner also includes the120s mobile notification/reflow regression (180s child), retaining selected-tab visibility in the existing horizontally scrollable navigation.
