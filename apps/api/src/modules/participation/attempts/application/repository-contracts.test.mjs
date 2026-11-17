import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { loadTsModule } from '../../../../../../../tests/helpers/load-ts-module.mjs';
const contracts = [
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/attempts/application/activity-eligibility.ts","repoFile":"apps/api/src/modules/participation/attempts/infrastructure/activity-eligibility-repository.ts","repoName":"ActivityEligibilityRepository","exportName":"repository","sqlHash":"b8a2cc86f1dca0ec90c7293d978f79afdd9767a7e43d2a974910f12943ed4c79"}, methods: [
  {"method":"enrollments","fields":[{"name":"classroomId","type":"string"},{"name":"enrollmentId","type":"string | null"}],"write":false},
  {"method":"activities","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string | null"}],"write":false},
  {"method":"clock","fields":[],"write":false},
  {"method":"insertObligation","fields":[{"name":"id","type":"string"},{"name":"now","type":"Date"},{"name":"classroomId","type":"string"},{"name":"enrollmentId","type":"string"},{"name":"activityId","type":"string"},{"name":"expected","type":"boolean"},{"name":"reason","type":"string"},{"name":"eligibleAt","type":"Date | null"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/attempts/application/activity-events.ts","repoFile":"apps/api/src/modules/participation/attempts/infrastructure/activity-events-repository.ts","repoName":"ActivityEventsRepository","exportName":"repository","sqlHash":"5259861d528955783e52fecc9d14bf272b926c4eee8e5062772434450bdb4c24"}, methods: [
  {"method":"insertEvent","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"},{"name":"event","type":"string"},{"name":"recipientId","type":"string | null"},{"name":"attemptId","type":"string | null"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/attempts/application/activity-participation.ts","repoFile":"apps/api/src/modules/participation/attempts/infrastructure/activity-participation-repository.ts","repoName":"ActivityParticipationRepository","exportName":"repository","sqlHash":"fb2ef411acbb180d56870f2ef1ec2d46d8a0a2e1937c51b8d14d17f92ece81b8"}, methods: [
  {"method":"obligation","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"latestAttempt","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"sessionClock","fields":[],"write":false},
  {"method":"existingAttempt","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"startClock","fields":[],"write":false},
  {"method":"insertAttempt","fields":[{"name":"id","type":"string"},{"name":"now","type":"Date"},{"name":"obligationId","type":"string"},{"name":"activityId","type":"string"},{"name":"deadline","type":"Date | null"},{"name":"editorTokenHash","type":"string | null"},{"name":"editorEpoch","type":"number"}],"write":false},
  {"method":"markStarted","fields":[{"name":"activityId","type":"string"},{"name":"now","type":"Date"}],"write":false},
  {"method":"transferEditor","fields":[{"name":"attemptId","type":"string"},{"name":"editorTokenHash","type":"string"},{"name":"now","type":"Date"}],"write":false},
  {"method":"eligibilityStudents","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"}],"write":false},
  {"method":"lockMember","fields":[{"name":"classroomId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"priorAttempts","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"authorizationClock","fields":[],"write":false},
  {"method":"authorizeObligation","fields":[{"name":"obligationId","type":"string"},{"name":"now","type":"Date"},{"name":"actorId","type":"string"},{"name":"deadline","type":"Date"}],"write":false},
  {"method":"authorizeAttempt","fields":[{"name":"attemptId","type":"string"},{"name":"deadline","type":"Date"},{"name":"now","type":"Date"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/attempts/application/activity-session.ts","repoFile":"apps/api/src/modules/participation/attempts/infrastructure/activity-session-repository.ts","repoName":"ActivitySessionRepository","exportName":"activity_sessionRepository","sqlHash":"ba23e0e77db5f89b7b8959b45b205a3f28ebbd7d1995da39d2e4392c715dc39e"}, methods: [
  {"method":"obligation","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"firstAttempt","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"answers","fields":[{"name":"attemptId","type":"string"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/attempts/application/attempt-access.ts","repoFile":"apps/api/src/modules/participation/attempts/infrastructure/attempt-access-repository.ts","repoName":"AttemptAccessRepository","exportName":"repository","sqlHash":"1fe1244d38c7cd31453bf0e6c25e8280f84f18b59d6968f0f5f1035c8daa95ef"}, methods: [
  {"method":"lockClassroom","fields":[{"name":"classroomId","type":"string"}],"write":false},
  {"method":"lockAttempt","fields":[{"name":"attemptId","type":"string"},{"name":"classroomId","type":"string"}],"write":false},
  {"method":"membership","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"clock","fields":[],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/attempts/application/attempt-attachments.ts","repoFile":"apps/api/src/modules/participation/attempts/infrastructure/attempt-attachments-repository.ts","repoName":"AttemptAttachmentsRepository","exportName":"repository","sqlHash":"bfd96010428eaeb70fdecd0d30c53dc55370540be9ceeb7e76f70615208205e1"}, methods: [
  {"method":"selected","fields":[{"name":"attemptId","type":"string"},{"name":"excludedFileId","type":"string | null"}],"write":false},
  {"method":"associate","fields":[{"name":"attemptId","type":"string"},{"name":"activityId","type":"string"},{"name":"classroomId","type":"string"},{"name":"fileId","type":"string"}],"write":false},
  {"method":"advanceRevision","fields":[{"name":"attemptId","type":"string"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/history/application/activity-history.ts","repoFile":"apps/api/src/modules/participation/history/infrastructure/activity-history-repository.ts","repoName":"ActivityHistoryRepository","exportName":"repository","sqlHash":"6feb2ae38d64813cfc6bc204d7db99f77c1fccde14a8bd7c8daab7eda41422ec"}, methods: [
  {"method":"expectedStudents","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"}],"write":false},
  {"method":"history","fields":[{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"},{"name":"studentId","type":"string | null"}],"write":false},
  {"method":"attempt","fields":[{"name":"attemptId","type":"string"},{"name":"classroomId","type":"string"}],"write":false},
  {"method":"obligation","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"viewClock","fields":[],"write":false},
  {"method":"lockObligation","fields":[{"name":"activityId","type":"string"},{"name":"classroomId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"lockAttempts","fields":[{"name":"obligationId","type":"string"}],"write":false},
  {"method":"reopenClock","fields":[],"write":false},
  {"method":"attachments","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"attachmentOrigin","fields":[{"name":"sourceAttemptId","type":"string"},{"name":"activityId","type":"string"},{"name":"classroomId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"insertReopenedAttempt","fields":[{"name":"id","type":"string"},{"name":"now","type":"Date"},{"name":"obligationId","type":"string"},{"name":"activityId","type":"string"},{"name":"attemptNumber","type":"number"},{"name":"actorId","type":"string"},{"name":"deadline","type":"Date"}],"write":false},
  {"method":"copyPractical","fields":[{"name":"attemptId","type":"string"},{"name":"sourceAttemptId","type":"string"}],"write":false},
  {"method":"copyAnswers","fields":[{"name":"attemptId","type":"string"},{"name":"sourceAttemptId","type":"string"},{"name":"now","type":"Date"}],"write":false},
  {"method":"copySelections","fields":[{"name":"attemptId","type":"string"},{"name":"sourceAttemptId","type":"string"}],"write":false},
  {"method":"copyAttachments","fields":[{"name":"attemptId","type":"string"},{"name":"sourceAttemptId","type":"string"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/practical-submissions/application/practical-submissions.ts","repoFile":"apps/api/src/modules/participation/practical-submissions/infrastructure/practical-submissions-repository.ts","repoName":"PracticalSubmissionsRepository","exportName":"repository","sqlHash":"cb6ddcef7d97136afb8d3522a9c84c70bf6841f0d360b4fa2d8b7fb250b2c997"}, methods: [
  {"method":"saveResponse","fields":[{"name":"attemptId","type":"string"},{"name":"text","type":"string | null"}],"write":false},
  {"method":"selectedAttachment","fields":[{"name":"attemptId","type":"string"},{"name":"fileId","type":"string"}],"write":false},
  {"method":"unlinkAttachment","fields":[{"name":"attemptId","type":"string"},{"name":"fileId","type":"string"}],"write":false},
  {"method":"pendingUpload","fields":[{"name":"fileId","type":"string"},{"name":"classroomId","type":"string"},{"name":"studentId","type":"string"},{"name":"attemptId","type":"string"}],"write":false},
  {"method":"cancelUpload","fields":[{"name":"fileId","type":"string"}],"write":false},
  {"method":"invalidateCustody","fields":[{"name":"fileId","type":"string"}],"write":false},
  {"method":"advanceAttempt","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"selectedAttachments","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"pendingAttachments","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"lockAttachment","fields":[{"name":"fileId","type":"string"}],"write":false},
  {"method":"attachmentOrigin","fields":[{"name":"sourceAttemptId","type":"string"},{"name":"activityId","type":"string"},{"name":"classroomId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"submitAttempt","fields":[{"name":"attemptId","type":"string"},{"name":"receivedAt","type":"Date"},{"name":"deadline","type":"Date | null"},{"name":"late","type":"boolean"}],"write":false},
  {"method":"submissions","fields":[{"name":"activityId","type":"string"},{"name":"classroomId","type":"string"}],"write":false},
  {"method":"submission","fields":[{"name":"attemptId","type":"string"},{"name":"classroomId","type":"string"}],"write":false}
 ] },
 { ...{"domain":"participation","file":"apps/api/src/modules/participation/questionnaires/application/questionnaire-attempts.ts","repoFile":"apps/api/src/modules/participation/questionnaires/infrastructure/questionnaire-attempts-repository.ts","repoName":"QuestionnaireAttemptsRepository","exportName":"repository","sqlHash":"487e21a89e97046c22d320e35d89d743e3a09e0990f861508efbdc7e860ad691"}, methods: [
  {"method":"question","fields":[{"name":"questionId","type":"string"},{"name":"activityId","type":"string"}],"write":false},
  {"method":"saveAnswer","fields":[{"name":"id","type":"string"},{"name":"attemptId","type":"string"},{"name":"activityId","type":"string"},{"name":"questionId","type":"string"},{"name":"text","type":"string | null"}],"write":false},
  {"method":"deleteSelections","fields":[{"name":"answerId","type":"string"}],"write":false},
  {"method":"insertSelection","fields":[{"name":"answerId","type":"string"},{"name":"questionId","type":"string"},{"name":"optionId","type":"string"}],"write":false},
  {"method":"advanceAttempt","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"submitAttempt","fields":[{"name":"attemptId","type":"string"},{"name":"receivedAt","type":"Date"},{"name":"deadline","type":"Date | null"},{"name":"late","type":"boolean"}],"write":false}
 ] }
];
function sample(field, index) { return field.type.startsWith('Date') ? new Date(index * 1000) : field.type.startsWith('boolean') ? true : field.type.startsWith('number') ? index + 1 : field.name + '-synthetic'; }
for (const contract of contracts) {
 test(contract.repoName + ' preserves every reviewed SQL expression and lock', () => {
  const source = fs.readFileSync(contract.repoFile, 'utf8'), ast = ts.createSourceFile(contract.repoFile, source, ts.ScriptTarget.Latest, true), sql = [];
  function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'tx.query') sql.push(node.arguments[0].getText(ast).replaceAll('\r\n','\n')); ts.forEachChild(node, visit); } visit(ast);
  assert.equal(createHash('sha256').update(JSON.stringify(sql)).digest('hex'), contract.sqlHash);
 });
 for (const operation of contract.methods) test(contract.repoName + '.' + operation.method + ' binds its command in reviewed SQL order on caller tx', async () => {
  const { [contract.exportName]: repository } = loadTsModule(contract.repoFile);
  const calls = [], tx = { async query(sql, ...values) { calls.push({ sql, values }); return []; } };
  const input = Object.fromEntries(operation.fields.map((field, index) => [field.name, sample(field, index)]));
  await repository[operation.method](tx, ...(operation.write ? [true] : []), ...(operation.fields.length ? [input] : []));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, operation.fields.map(field => input[field.name]));
 });
}
