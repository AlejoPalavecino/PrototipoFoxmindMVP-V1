import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Activity AI runtime units load under native TypeScript without Nest decorators or database', () => {
  const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(k => process.env[k]).map(k => [k,process.env[k]]));
  const child = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--input-type=module',
    '-e', "import { ActivityAiService } from './apps/api/src/modules/activities/infrastructure/activity-ai/service.ts'; import { ActivityAiWorker } from './apps/api/src/modules/activities/infrastructure/activity-ai/worker.ts'; if (typeof ActivityAiService !== 'function' || typeof ActivityAiWorker !== 'function') process.exit(2);"],
  { env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
});

test('Classroom composition loads under native TypeScript without Nest decorators or database', () => {
  const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(k => process.env[k]).map(k => [k,process.env[k]]));
  const child = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--input-type=module',
    '-e', "import { ClassroomService } from './apps/api/src/bootstrap/academic-composition.ts'; if (typeof ClassroomService !== 'function') process.exit(2);"],
  { env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
});
