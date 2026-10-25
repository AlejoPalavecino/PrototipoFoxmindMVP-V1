# FoxMind 3D — blind dual review ledger

- Coordinator: /root; runtime identity unavailable; no memory writes.
- Date: 2026-10-25.
- Base: eecb769151b12abb5ae9e1f15839b54c772e446f.
- Immutable initial target TREE: 1c9984dbffaf0d07afe43df4bb741a16c7408867.
- Branch: codex/foxmind-3d-migration.
- Method: global user AGENTS L3 explicitly selects Judgment Day. Both read-only judges received identical target, scope and criteria with resolved judgment-day, clean-architecture, sdd-ambiguity-gate and caveman-review SKILL.md paths. No ordinary 4R/refuter review is combined with this target. Current user authorization to implement/fix this migration covers necessary local corrections; no renewed permission or publication authority is inferred.
- Status: in_progress; no terminal approval yet.

## Initial blind results (both returned before correction)

`/root/jd_judge_a` inspected the frozen diff, real source and tests; ran56pure checks PASS; no writes or services. `/root/jd_judge_b` inspected the same frozen target and ran47pure checks PASS; no writes/services. Their independent reproductions used read-only component harnesses, temporal helpers and in-memory SQL NULL/FILTER semantics (SQLite, not claimed as PostgreSQL integration). Neither inspected the other result or performed visual acceptance. Coordinator persists this attribution; neither judge authored this ledger or product changes.

| ID | Disposition | Severity | Frozen proof / required behavior |
|---|---|---|---|
| JD-01 | Confirmed by A+B | ERROR | AppNavbar prevents native navigation for new /settings, /profile and avatar, but Classrooms callback maps unknown paths to classrooms. A and B independently observed routed=[classrooms,classrooms]. Preserve internal Home/Aulas/Agenda while routing account destinations exactly. |
| JD-02 | Confirmed by A+B | ERROR | queries-review ready expression is NULL for an existing private TP grade with final_grade NULL. Both ready and NOT ready filters omit the attempt. NULL means needsReview; zero remains complete/ready. |
| JD-03 | Suspect, reported by A | ERROR | Private timed event target retains original local date rather than view-zone date. Kiritimati2026-10-27T00:30 becomes2026-10-26T10:30Z; viewEtc/GMT+12 needs2026-10-25, current target selects27. Needs scoped corroboration before automatic fix under this method. |
| JD-04 | Suspect, reported by B | ERROR | Private-event prefilter clips a valid start within90days when event/view date zones differ. now2026-01-01T00Z, viewEtc/GMT+12; Kiritimati2026-04-01T03:00 is2026-03-31T13Z and within horizon but local-date bound excludes it. Needs scoped corroboration before automatic fix. |
| JD-05 | INFO, A+B | WARNING | SQL expands all matching event parents before LIMIT4. Contract specifies at most201parents and module unavailable above200. No runtime degradation was measured by judges; do not claim one. Add direct contract-limit evidence for scoped reassessment. |

## Round-one correction boundary

Only JD-01/JD-02 are confirmed severe and released to bounded fix actor after independent RED. Test runner owns all regression files, fix actor owns product correction. Do not silently auto-fix JD-03/JD-04 or turn warnings into blockers without corroboration. Scoped re-judgment will receive this frozen ledger, immutable fix delta and concrete added proof. Maximum two fix/re-judgment rounds; never reset the budget.

Ongoing original visual implementation QA separately identified a search-label cascade and classroom header context/alignment error in real media-screen browser exports. These are coordinator-observed presentation acceptance work (not fixes inferred from unconfirmed judge rows); any resulting code delta must be frozen and included in scoped re-judgment before delivery. Original UI authorization remains active, and no PR/push/deployment is included.

## Added deterministic regression proof for scoped re-judgment

Test runner `/root/visual_tests` wrote tests/foxmind-3d-regressions.test.mjs, no product changes. Initial command `node --experimental-transform-types --test --test-reporter=tap tests/foxmind-3d-regressions.test.mjs`:7tests0PASS7FAIL,6809ms; private PostgreSQL rollback/cleanup. JD01 did not assign requested profile/settings/avatar paths; JD02 private NULL TP produced0/0/0 instead of total1/needs1/ready0. Both confirmed IDs were released after this RED.

After round-one product fix, the complete unfiltered regression file observed8tests4PASS4FAIL0SKIP (2825ms). JD01 Home/MisAulas exact account paths and modifier/middle-click native-navigation guard PASS. JD02 PostgreSQL privateNULL→needs1, privatezero→ready1 and published TP/quiz/exam exclusion PASS. The remaining three failing leaf cases are the frozen suspect/info proof below; the fourth failure is their parent, not another defect. No failure was skipped or erased.

- JD03 real PostgreSQL: private Kiritimati event local2026-10-27T00:30, viewEtc/GMT+12, actual target.date27, expected25 (start2026-10-26T10:30Z). Root asks both judges to corroborate the other judge's initially isolated defect using this frozen concrete proof.
- JD04 real PostgreSQL: now2026-01-01T00Z, viewEtc/GMT+12, private Kiritimati event local2026-04-01T03:00→2026-03-31T13Z is inside exact90-day horizon but missing. Initial fixture03:30 reproduced the same failure; refined03:00 exact proof also failed before any timezone fix.
- JD05 contract proof strengthened from potential workload to deterministic behavior: SQL verifies201matching parents; aggregate module returns ready/items instead of specified error SERVICE_UNAVAILABLE. No runtime slowdown measurement is claimed. Both judges may reassess severity against explicit guard acceptance using this exact proof, rather than merely hypothetical performance.

Test streams remain in ignored .test-artifacts/foxmind-3d-regressions-red.test.tap and -round1.test.tap; coordinator will retain safe summaries/artifacts for final evidence. Matching product source is frozen before scoped re-judgment; no suspect timezone or parent-bound fix has been made.

## Frozen unchanged excerpts for scoped corroboration

The following code is copied from initial TREE1c9984d; it is evidence, not a new fix. Re-judges need not inspect unrelated modules to evaluate the temporal/parent-bound proof.

### apps/api/src/home/miniagenda.ts at initial tree

~~~ts
import { projectPrivateTiming, type PrivateTiming } from './private-timing.ts';
import { type AgendaItem, type HomeActor, type HomeModules, type HomePageQuery, parseHomeModuleResponse } from '../../../../src/core/domain/index.ts';
import type { HomeSql } from './database-types.ts';
import { authorizedRooms } from './queries-participation.ts';
import { baseJson, targetJson, instant } from './query-values.ts';
import { nextCursor, readCursor } from './cursor.ts';
const academic = `SELECT a.id,
  ${baseJson('a.id', 'a.title', targetJson('activity', ",'activityId',a.id"))}
  || jsonb_build_object('source','ACADEMIC_DEADLINE','startAt',${instant('d.deadline')},
    'date',to_char(d.deadline AT TIME ZONE $4::text,'YYYY-MM-DD'),'timeZone',c.timezone,'allDay',false) AS item,
  d.deadline AS start_at, NULL::jsonb AS timing
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  LEFT JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
  LEFT JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.activity_id=a.id
  LEFT JOIN LATERAL (SELECT status,individual_deadline_at FROM attempts WHERE student_activity_id=sa.id ORDER BY attempt_number DESC LIMIT 1) t ON true
  CROSS JOIN LATERAL (SELECT CASE WHEN c.role='teacher' THEN a.deadline_at
    ELSE GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at)) END AS deadline) d
  WHERE c.archived_at IS NULL AND (c.role='teacher' OR (sa.is_expected AND COALESCE(t.status::text,'DRAFT')<>'SUBMITTED'))`;
const privateEvents = `SELECT md5(e.id::text || ':' || occurrence.day::text)::uuid AS id,
  jsonb_build_object('id',md5(e.id::text || ':' || occurrence.day::text)::uuid,'title',e.title,'classroom',null,
    'target',jsonb_build_object('kind','private-event','eventId',e.id,
       'occurrenceId',md5(e.id::text || ':' || occurrence.day::text)::uuid,'date',occurrence.day::text),
    'source','PRIVATE_EVENT','startAt',CASE WHEN e.schedule_kind='ALL_DAY' THEN NULL ELSE ${instant('timing.start_at')} END,
    'date',occurrence.day::text,'timeZone',COALESCE(e.time_zone,$4::text),'allDay',e.schedule_kind='ALL_DAY') AS item,
  timing.start_at, jsonb_build_object('schedule',CASE WHEN e.schedule_kind='ALL_DAY'
    THEN jsonb_build_object('kind','ALL_DAY','startDate',e.start_date::text,'endDateExclusive',e.end_date_exclusive::text)
    ELSE jsonb_build_object('kind','TIMED','timeZone',e.time_zone,'startLocal',e.start_local,'endLocal',e.end_local)
      || CASE WHEN e.start_offset_minutes IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('startOffsetMinutes',e.start_offset_minutes) END
      || CASE WHEN e.end_offset_minutes IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('endOffsetMinutes',e.end_offset_minutes) END END,
    'repeat',CASE WHEN e.repeat_kind='NONE' THEN jsonb_build_object('kind','NONE') ELSE jsonb_build_object('kind','WEEKLY','untilDate',e.repeat_until::text) END) AS timing
  FROM agenda_events e CROSS JOIN LATERAL generate_series(0,
    CASE WHEN e.repeat_kind='WEEKLY' THEN (e.repeat_until-e.start_date)/7 ELSE 0 END) n
  CROSS JOIN LATERAL (SELECT e.start_date+(n*7) AS day) occurrence
  CROSS JOIN LATERAL (SELECT CASE WHEN e.schedule_kind='ALL_DAY' THEN occurrence.day::timestamp AT TIME ZONE $4::text
    WHEN n=0 THEN e.start_at ELSE (e.start_local::timestamp+(n*7)*interval '1 day') AT TIME ZONE e.time_zone END AS start_at) timing
  WHERE e.owner_id=$1::uuid AND e.start_date<=($2::timestamptz AT TIME ZONE $4::text)::date+90
    AND COALESCE(e.repeat_until,e.start_date)>=($2::timestamptz AT TIME ZONE $4::text)::date-2`;
export async function readMiniagenda(tx: HomeSql, actor: HomeActor, query: HomePageQuery): Promise<HomeModules['agenda']> {
  const after = readCursor(actor, query);
  const rows = await tx.query<{ item: AgendaItem; sort_key: string; timing: PrivateTiming | null }>(`WITH rooms AS (${authorizedRooms}),
    source AS (${academic} UNION ALL ${privateEvents}), future AS (
      SELECT item,timing,${instant('start_at')} || '|' || id::text AS sort_key FROM source
      WHERE start_at>$2::timestamptz AND start_at<$2::timestamptz+interval '90 days')
    SELECT * FROM future WHERE ($3::text='' OR sort_key>$3::text) ORDER BY sort_key LIMIT 4`,
  actor.userId, actor.now, after, query.timeZone);
  const visible = rows.slice(0, 3);
  return parseHomeModuleResponse({ subjectId: actor.userId, generatedAt: actor.now, module: 'agenda',
    page: { status: 'ready', items: visible.map(row => projectPrivateTiming(row.item,row.timing)), totalItems: null,
      nextCursor: rows.length > 3 ? nextCursor(actor, query, visible[2].sort_key) : null } }).page as HomeModules['agenda'];
}
~~~

### apps/api/src/home/private-timing.ts at initial tree

~~~ts
import { HomeError, scheduleInstants, seriesSchedules, type AgendaItem, type EventSchedule, type EventRepeat } from '../../../../src/core/domain/index.ts';
export interface PrivateTiming { schedule: EventSchedule; repeat: EventRepeat }
/** SQL finds bounded candidates; the same Agenda domain resolves the actual local schedule and DST policy. */
export function projectPrivateTiming(item: AgendaItem, timing: PrivateTiming | null): AgendaItem {
  if (timing === null) return item;
  if (item.target.kind !== 'private-event') throw new HomeError('SERVICE_UNAVAILABLE');
  const date = item.target.date;
  const schedule = seriesSchedules({title:item.title,description:'',category:'CLASS',...timing})
    .find(value => (value.kind === 'TIMED' ? value.startLocal.slice(0,10) : value.startDate) === date);
  if (!schedule) throw new HomeError('SERVICE_UNAVAILABLE');
  if (schedule.kind === 'ALL_DAY') return item;
  return {...item,startAt:scheduleInstants(schedule).startAt,timeZone:schedule.timeZone};
}
~~~

### apps/agenda-ui/useAgendaEventTarget.ts at initial tree

~~~ts
import { useEffect, useRef, useState } from 'react';
import type { AgendaClient } from './api.ts';

export interface AgendaEventRequest { eventId: string; date: string }

/** Authorize the event before selecting its day; late responses cannot move a new target. */
export function useAgendaEventTarget(api: AgendaClient, target: AgendaEventRequest | null | undefined, select: (day: string) => void) {
  const [focusEventId, setFocusEventId] = useState<string>();
  const [error, setError] = useState('');
  const selection = useRef(select);
  selection.current = select;
  const eventId = target?.eventId, date = target?.date;
  useEffect(() => {
    let active = true;
    setFocusEventId(undefined); setError('');
    if (!eventId || !date) return;
    void api.get(eventId).then(event => {
      if (!active) return;
      if (event.id !== eventId) { setError('El evento ya no está disponible.'); return; }
      selection.current(date); setFocusEventId(eventId);
    }).catch(() => { if (active) setError('No pudimos abrir ese evento. El acceso puede haber cambiado; vuelve a consultar tu agenda.'); });
    return () => { active = false; };
  }, [api, eventId, date]);
  return { focusEventId, error };
}
~~~

## Scoped re-judgment1 outcome and final correction round

Both jd_judge_a and jd_judge_b independently returned over frozen ledger/delta 1c9984d to5fe7d62. Both clear JD01/JD02; both now corroborate JD03/JD04 as ERROR with the real PostgreSQL regressions. Both promote JD05 from potential-workload WARNING to deterministic contract ERROR because201confirmed parents incorrectly produce ready instead of specified unavailable. Neither claims measured slowdown. Each reran the exact regression file with8tests4PASS4FAIL0SKIP (three remaining leaves and parent), observed no additional fix-caused issue and made no writes. Their matching output now confirms all three remaining IDs severe; no suspect/contradiction remains.

Release bounded second/final correction round to jd_fix_agent ONLY for JD03/JD04/JD05, after already observed RED. Preserve original local/date for series expansion and derive timed target day in requested view zone; widen local-date candidates then apply exact90-day instant horizon; bound parents before expansion with a201-row sentinel and error above200. Test runner owns regression additions/independent proof. One final scoped re-judgment remains; no third fix/re-judgment round is authorized by this method. Final current-user local implementation authorization covers these necessary confirmed corrections; no renewed permission or delivery/publication authority is inferred.

## Second/final correction proof

Bounded actor `/root/jd_fix_agent` changed only miniagenda.ts/private-timing.ts for JD03/JD04/JD05 (+36/-15lines). Original occurrence date remains the key for domain series expansion; TIMED items then derive both date and target.date using localMinuteAt(actualInstant,query.timeZone), preserving ALL_DAY floating dates. The candidate parent query has LIMIT201 before expansion; above200 throws HomeError recovered as agenda module unavailable. Parent IDs are materialized/bound into the occurrence query. Academic candidates retain LIMIT4. Private recurrence candidates are explicitly bounded by200parents, existing53-occurrence series maximum and temporal window, resolved with existing domain scheduling, then filtered by exact(now,now+90days), sorted and paged3+cursor. This bounded private-candidate resolution is required before final ordering so DST/zone normalization cannot silently discard a valid result; it is not an unlimited client/server fan-out. No visible API payload limit, authorization, grade or existing Agenda contract was widened.

Independent tester added pre-GREEN boundaries200→ready/201→onlyagendaerror with six other modules healthy, ALL_DAYfloating date preservation and weekly TIMED expansion before conversion. Its fresh PostgreSQL/regression suite observed23PASS/0FAIL/0SKIP in3282ms; academic6-item pagination and equality at now/+90days were also checked. Fresh API build6.58s within30s and Next8362ms within180s passed. Final new+affected suite subsequently observed180tests176PASS/0FAIL/4existingoptionalSKIP. Actor's own observed checks and scope are in2026-10-25-jd-fix-visual.md; neither actor nor tester modified the frozen ledger or claimed final judgment.

Live Group5 then confirmed JD01 through nine account-link/ avatar routes (one actual pointer click passed, others legal keyboard navigation), and JD03 through real extreme-zone Home→Agenda URL/date→authorized visible/focused event. These are actual ego actions/GET proofs, not programmatic mutation or SSR substitutes. Full final UI acceptance and final immutable tree are coordinator-owned and follow separately.

## Final bounded result — approved

Both read-only judges independently completed scoped re-judgment2 on final TREE9ad34da620d1336700a88dccf5fabeb78f3689d9, limited to the frozen ledger and immutable delta from5fe7d62. Both returned findings=[] and independently observed10regression tests PASS/0FAIL/0SKIP on owned PostgreSQL with rollback (A3212ms, B~3077ms). Both verified source equality and diff-check, cleared JD03/JD04/JD05 and preserved JD01/JD02 resolution. No fix-caused defect was found. Neither performed pixel acceptance or wrote files; coordinator persists their native result facts. All five severe IDs are resolved; suspects0, contradictions0 and remainingINFO0. Exactly two correction/re-judgment rounds were used; no reset/refuter/third round occurred.

```yaml
target_identity: git-tree:9ad34da620d1336700a88dccf5fabeb78f3689d9
round: 2
confirmed_resolved: [JD-01, JD-02, JD-03, JD-04, JD-05]
suspect: []
contradictions: []
info: []
fix_work_units: [account-routing, nullable-private-grade, timezone-target-and-horizon-and-parent-guard]
scoped_rejudgment: approved
terminal_state: approved
skill_resolution: paths-injected
```

JUDGMENT: APPROVED ✅

This verdict covers the exact tree above, not a future modified tree and not publication authority. The final original-request CSS entrance leaf (12lines in foxmind-3d-controls.css, no functional change) follows the separate L1 decorative fast-track and is recorded/checked separately; it is not mislabeled as part of this exhausted Judgment Day target. Composed delivery must preserve all reviewed product bytes except that explicitly identified leaf. Pixel/runtime evidence and native/performance advisories remain attributed in the coordinator/evidence records.
