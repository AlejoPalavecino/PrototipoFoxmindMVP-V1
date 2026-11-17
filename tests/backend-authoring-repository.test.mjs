import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthoringRepository } from '../apps/api/src/modules/activities/authoring/infrastructure/authoring-repository.ts';

// Frozen queries/argument order from the pre-contract adapter; synthetic values only.
const cases = [
  {"name": "findActivity", "input": {"activityId": "activity", "classroomId": "room", "lock": "share"}, "sql": "SELECT * FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE", "args": ["activity", "room"]},
  {"name": "listActivities", "input": {"classroomId": "room", "includeDrafts": true}, "sql": "SELECT * FROM activities WHERE classroom_id=$1::uuid\n        AND ($2::boolean OR status='PUBLISHED') ORDER BY created_at DESC,id", "args": ["room", true]},
  {"name": "listPendingReviews", "input": {"classroomId": "room"}, "sql": "SELECT t.activity_id,count(*)::int AS count\n        FROM attempts t JOIN activities a ON a.id=t.activity_id\n        LEFT JOIN attempt_grades g ON g.attempt_id=t.id\n        WHERE a.classroom_id=$1::uuid AND t.status='SUBMITTED' AND NOT COALESCE(g.is_published,false)\n        GROUP BY t.activity_id", "args": ["room"]},
  {"name": "listStudentActivityStates", "input": {"classroomId": "room", "studentId": "student"}, "sql": "SELECT sa.activity_id,sa.is_expected AS expected,t.status::text AS status,t.attempt_number AS number,\n        COALESCE(g.is_published,false) AS published,t.individual_deadline_at AS individual_deadline,sa.first_submission_deadline_at AS first_deadline\n        FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id\n        LEFT JOIN LATERAL(SELECT a.* FROM attempts a WHERE a.student_activity_id=sa.id ORDER BY a.attempt_number DESC LIMIT 1)t ON true\n        LEFT JOIN attempt_grades g ON g.attempt_id=t.id WHERE sa.classroom_id=$1::uuid AND e.student_id=$2::uuid", "args": ["room", "student"]},
  {"name": "createDraft", "input": {"activityId": "activity", "now": "2026-01-01", "classroomId": "room", "type": "ASSIGNMENT"}, "sql": "INSERT INTO activities(id,updated_at,classroom_id,type) VALUES($1::uuid,$2,$3::uuid,$4::\"ActivityType\") RETURNING id", "args": ["activity", "2026-01-01", "room", "ASSIGNMENT"]},
  {"name": "updateMetadata", "input": {"activityId": "activity", "title": null, "unitId": "unit", "topicId": null, "now": "2026-01-01"}, "sql": "UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=$5 WHERE id=$1::uuid RETURNING id", "args": ["activity", null, "unit", null, "2026-01-01"]},
  {"name": "updateDeadline", "input": {"activityId": "activity", "deadline": null, "allowLate": false, "now": "2026-01-01"}, "sql": "UPDATE activities SET deadline_at=$2,allow_late_submissions=$3,updated_at=$4 WHERE id=$1::uuid RETURNING id", "args": ["activity", null, false, "2026-01-01"]},
  {"name": "saveContent", "input": {"activityId": "activity", "title": null, "unitId": "unit", "topicId": null, "instructions": "text", "attachmentRequired": false, "deadline": null, "allowLate": true, "now": "2026-01-01", "aiGradingRubric": null, "evaluationRubric": null, "hasObjective": false, "objective": null, "hasTeacherComment": true, "teacherComment": null, "hasTeacherBrief": true, "teacherBrief": "brief"}, "sql": "UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,instructions_text=$5,\n            attachments_required=$6,deadline_at=$7,allow_late_submissions=$8,updated_at=$9,\n            ai_grading_rubric=COALESCE($10::text,ai_grading_rubric),evaluation_rubric=COALESCE($11::jsonb,evaluation_rubric),\n            objective=CASE WHEN $12::boolean THEN $13::text ELSE objective END,\n            teacher_comment=CASE WHEN $14::boolean THEN $15::text ELSE teacher_comment END,\n            teacher_brief=CASE WHEN $16::boolean THEN $17::text ELSE teacher_brief END WHERE id=$1::uuid RETURNING id", "args": ["activity", null, "unit", null, "text", false, null, true, "2026-01-01", null, null, false, null, true, null, true, "brief"]},
  {"name": "publishActivity", "input": {"activityId": "activity", "now": "2026-01-01"}, "sql": "UPDATE activities SET status='PUBLISHED',published_at=$2,updated_at=$2 WHERE id=$1::uuid RETURNING id", "args": ["activity", "2026-01-01"]},
  {"name": "withdrawActivity", "input": {"activityId": "activity", "now": "2026-01-01"}, "sql": "UPDATE activities SET status='WITHDRAWN',updated_at=$2 WHERE id=$1::uuid RETURNING id", "args": ["activity", "2026-01-01"]},
  {"name": "findMaterial", "input": {"materialId": "material", "classroomId": "room"}, "sql": "SELECT file_id,deleted_at FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE", "args": ["material", "room"]},
  {"name": "listQuestions", "input": {"activityId": "activity"}, "sql": "SELECT id,type,prompt,available_points::text AS points,scoring_rule AS \"scoringRule\"\n      FROM questions WHERE activity_id=$1::uuid ORDER BY position,id", "args": ["activity"]},
  {"name": "listQuestionOptions", "input": {"activityId": "activity"}, "sql": "SELECT o.id,o.question_id,o.text,o.is_correct AS correct FROM question_options o\n      JOIN questions q ON q.id=o.question_id WHERE q.activity_id=$1::uuid ORDER BY o.position,o.id", "args": ["activity"]},
  {"name": "listInstructionFiles", "input": {"activityId": "activity"}, "sql": "SELECT f.id,f.original_name AS name,f.extension,\n      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'\n       AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready\n      FROM activity_instruction_files a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id\n      WHERE a.activity_id=$1::uuid ORDER BY f.created_at,f.id", "args": ["activity"]},
  {"name": "listMaterials", "input": {"activityId": "activity"}, "sql": "SELECT m.id,m.title,m.file_id AS \"fileId\",f.extension\n      FROM activity_materials a JOIN materials m ON m.id=a.material_id JOIN files f ON f.id=m.file_id WHERE a.activity_id=$1::uuid ORDER BY m.created_at,m.id", "args": ["activity"]}
];

for (const scenario of cases) {
  if (scenario.input.now) {
    scenario.input.now = new Date(scenario.input.now);
    scenario.args = scenario.args.map(value => value === '2026-01-01' ? scenario.input.now : value);
  }
  test(`authoring ${scenario.name} preserves SQL, parameters and transaction`, async () => {
    const rows = [{ id: 'result' }];
    const tx = { query: async function (sql, ...args) {
      assert.equal(this, tx); assert.equal(sql, scenario.sql); assert.deepEqual(args, scenario.args); return rows;
    } };
    assert.equal(await createAuthoringRepository()[scenario.name](tx, scenario.input), rows);
  });
}
test('activity write lock is chosen by a bounded mode', async () => {
  const tx = { query: async (sql, ...args) => {
    assert.equal(sql, cases[0].sql.replace('FOR SHARE', 'FOR UPDATE'));
    assert.deepEqual(args, ['activity', 'room']); return [];
  } };
  await createAuthoringRepository().findActivity(tx, { activityId: 'activity', classroomId: 'room', lock: 'update' });
});


test('authoring commands and results reject invalid consumer types', async () => {
  const ts = (await import('typescript')).default;
  const { resolve } = await import('node:path');
  const path = resolve('apps/api/src/modules/activities/authoring/application/contract-type-fixture.ts');
  const source = [
    "import type { AuthoringRepository } from './authoring-repository.ts';",
    "import type { Transaction } from '../../../classrooms/public.ts';",
    'declare const repository: AuthoringRepository;',
    'declare const tx: Transaction;',
    "repository.findActivity(tx, { activityId: 'a', classroomId: 'c', lock: 'share' });",
    "repository.createDraft(tx, { activityId: 'a', classroomId: 'c', now: new Date(), type: 'ASSIGNMENT' });",
    '// @ts-expect-error The lock is a bounded mode, never an SQL fragment.',
    "repository.findActivity(tx, { activityId: 'a', classroomId: 'c', lock: 'SHARE; DROP TABLE activities' });",
    '// @ts-expect-error Required classroom scope cannot be omitted.',
    "repository.findActivity(tx, { activityId: 'a', lock: 'share' });",
    '// @ts-expect-error Callers cannot choose a result type.',
    "repository.listActivities<{ secret: string }>(tx, { classroomId: 'c', includeDrafts: true });",
    '// @ts-expect-error Positional query values are no longer accepted.',
    "repository.updateDeadline(tx, 'a', null, false, new Date());",
    '// @ts-expect-error Domain activity types are enforced.',
    "repository.createDraft(tx, { activityId: 'a', classroomId: 'c', now: new Date(), type: 'OTHER' });",
    "repository.listPendingReviews(tx, { classroomId: 'c' }).then(rows => {",
    '  const count: number = rows[0].count;',
    '  // @ts-expect-error Pending review counts are concrete numbers.',
    '  const invalid: string = rows[0].count;',
    '});',
  ].join('\n');
  const options = { strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => resolve(file) === path
    ? ts.createSourceFile(path, source, options.target, true) : getSourceFile(file, ...args);
  const program = ts.createProgram([path], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.file && resolve(item.file.fileName) === path);
  assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
});


test('content save preserves omitted, empty and explicit-null field parameters', async () => {
  const baseline = cases.find(item => item.name === 'saveContent');
  for (const aiGradingRubric of [undefined, null, '', 'rubric']) {
    for (const present of [false, true]) {
      const input = { ...baseline.input, aiGradingRubric, evaluationRubric: present ? '[]' : null,
        hasObjective: present, objective: present ? '' : null,
        hasTeacherComment: present, teacherComment: null, hasTeacherBrief: present, teacherBrief: null };
      const tx = { query: async (sql, ...args) => {
        assert.equal(sql, baseline.sql);
        assert.deepEqual(args.slice(9), [aiGradingRubric, present ? '[]' : null, present, present ? '' : null, present, null, present, null]);
        return [];
      } };
      await createAuthoringRepository().saveContent(tx, input);
    }
  }
});
