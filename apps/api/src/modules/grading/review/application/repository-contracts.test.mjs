import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { loadTsModule } from '../../../../../../../tests/helpers/load-ts-module.mjs';
const contracts = [
 { ...{"domain":"grading","file":"apps/api/src/modules/grading/assistance/application/grading-ai/service.ts","repoFile":"apps/api/src/modules/grading/assistance/infrastructure/grading-ai/service-repository.ts","repoName":"GradingAiRepository","exportName":"repository","sqlHash":"e12a2b3f5e54499cfd71126011f7e0549760a95205fd8ecb01f1efe8c71db858"}, methods: [
  {"method":"job","fields":[{"name":"classroomId","type":"string"},{"name":"attemptId","type":"string"},{"name":"jobId","type":"string | null"}],"write":false},
  {"method":"apply","fields":[{"name":"jobId","type":"string"},{"name":"requestId","type":"string"},{"name":"inputHash","type":"string"}],"write":false},
  {"method":"discard","fields":[{"name":"jobId","type":"string"},{"name":"requestId","type":"string"},{"name":"inputHash","type":"string"}],"write":false}
 ] },
 { ...{"domain":"grading","file":"apps/api/src/modules/grading/corrections/application/grade-corrections.ts","repoFile":"apps/api/src/modules/grading/corrections/infrastructure/grade-corrections-repository.ts","repoName":"GradeCorrectionsRepository","exportName":"grade_correctionsRepository","sqlHash":"648819d415d18ae7198882f5122df426c86d0045448ed70ffefef9a689c5c917"}, methods: [
  {"method":"corrections","fields":[{"name":"gradeId","type":"string"}],"write":false},
  {"method":"insertCorrection","fields":[{"name":"gradeId","type":"string"},{"name":"previousGrade","type":"string"},{"name":"newGrade","type":"string"},{"name":"reason","type":"string"},{"name":"actorId","type":"string"}],"write":false},
  {"method":"updatePublishedGrade","fields":[{"name":"gradeId","type":"string"},{"name":"newGrade","type":"string"}],"write":false},
  {"method":"notifyCorrection","fields":[{"name":"studentId","type":"string"},{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"},{"name":"attemptId","type":"string"},{"name":"gradeId","type":"string"}],"write":false}
 ] },
 { ...{"domain":"grading","file":"apps/api/src/modules/grading/progress/application/progress.ts","repoFile":"apps/api/src/modules/grading/progress/infrastructure/progress-repository.ts","repoName":"ProgressRepository","exportName":"repository","sqlHash":"6430dbd5443e8e01685497d46ea5f98eeabb91a4cd4dac28ff350ec7f7b71547"}, methods: [
  {"method":"progressRows","fields":[{"name":"classroomId","type":"string"},{"name":"studentId","type":"string | null"}],"write":false},
  {"method":"students","fields":[{"name":"classroomId","type":"string"},{"name":"studentId","type":"string | null"}],"write":false},
  {"method":"topics","fields":[{"name":"classroomId","type":"string"}],"write":false},
  {"method":"units","fields":[{"name":"classroomId","type":"string"}],"write":false},
  {"method":"member","fields":[{"name":"classroomId","type":"string"},{"name":"studentId","type":"string"}],"write":false},
  {"method":"report","fields":[{"name":"enrollmentId","type":"string"},{"name":"evidenceHash","type":"string"}],"write":false}
 ] },
 { ...{"domain":"grading","file":"apps/api/src/modules/grading/publication/application/grade-publication.ts","repoFile":"apps/api/src/modules/grading/publication/infrastructure/grade-publication-repository.ts","repoName":"GradePublicationRepository","exportName":"grade_publicationRepository","sqlHash":"e288984198f6e32f08c1f68ea495b7888d1ad46782d64017bcb193de7f166279"}, methods: [
  {"method":"lockQuestionGrades","fields":[{"name":"gradeId","type":"string"},{"name":"activityId","type":"string"}],"write":false},
  {"method":"publishGrade","fields":[{"name":"gradeId","type":"string"},{"name":"finalGrade","type":"string"}],"write":false},
  {"method":"updateQuestionGrade","fields":[{"name":"gradeId","type":"string"},{"name":"questionId","type":"string"},{"name":"numerator","type":"string"},{"name":"denominator","type":"string"}],"write":false},
  {"method":"setEffectiveGrade","fields":[{"name":"obligationId","type":"string"},{"name":"gradeId","type":"string"}],"write":false},
  {"method":"notifyPublication","fields":[{"name":"studentId","type":"string"},{"name":"classroomId","type":"string"},{"name":"activityId","type":"string"},{"name":"attemptId","type":"string"},{"name":"gradeId","type":"string"}],"write":false},
  {"method":"resultAttempt","fields":[{"name":"attemptId","type":"string"},{"name":"classroomId","type":"string"}],"write":false},
  {"method":"publishedGrade","fields":[{"name":"attemptId","type":"string"},{"name":"obligationId","type":"string"},{"name":"activityId","type":"string"}],"write":false},
  {"method":"resultQuestions","fields":[{"name":"gradeId","type":"string"},{"name":"attemptId","type":"string"},{"name":"activityId","type":"string"}],"write":false},
  {"method":"resultAttachments","fields":[{"name":"attemptId","type":"string"}],"write":false}
 ] },
 { ...{"domain":"grading","file":"apps/api/src/modules/grading/review/application/grading.ts","repoFile":"apps/api/src/modules/grading/review/infrastructure/grading-repository.ts","repoName":"GradingRepository","exportName":"gradingRepository","sqlHash":"29c0b6f5808f6d8268eb4b0223d76861d7a8b263ca65f40876ffad17484cc38c"}, methods: [
  {"method":"lockAttempt","fields":[{"name":"attemptId","type":"string"},{"name":"classroomId","type":"string"}],"write":true},
  {"method":"lockGrade","fields":[{"name":"attemptId","type":"string"},{"name":"obligationId","type":"string"},{"name":"activityId","type":"string"}],"write":true},
  {"method":"answers","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"savedQuestionGrades","fields":[{"name":"gradeId","type":"string"}],"write":false},
  {"method":"attachments","fields":[{"name":"attemptId","type":"string"}],"write":false},
  {"method":"savePrivateGrade","fields":[{"name":"id","type":"string"},{"name":"attemptId","type":"string"},{"name":"obligationId","type":"string"},{"name":"activityId","type":"string"},{"name":"finalGrade","type":"string | null"},{"name":"overallFeedback","type":"string | null"},{"name":"actorId","type":"string"},{"name":"rubricSnapshot","type":"string | null"},{"name":"rubricMarks","type":"string"},{"name":"suggestedGrade","type":"string | null"},{"name":"finalGradeOverride","type":"string | null"},{"name":"calculatedGrade","type":"string | null"}],"write":false},
  {"method":"saveQuestionGrade","fields":[{"name":"id","type":"string"},{"name":"gradeId","type":"string"},{"name":"activityId","type":"string"},{"name":"questionId","type":"string"},{"name":"numerator","type":"string | null"},{"name":"denominator","type":"string | null"},{"name":"feedback","type":"string | null"}],"write":false}
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
