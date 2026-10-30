import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Activity AI public barrel loads under native TypeScript without Nest decorators or database', () => {
  const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(k => process.env[k]).map(k => [k,process.env[k]]));
  const child = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--input-type=module',
    '-e', "import { ActivityAiService, ActivityAiWorker } from './apps/api/src/classrooms/activity-ai/index.ts'; if (typeof ActivityAiService !== 'function' || typeof ActivityAiWorker !== 'function') process.exit(2);"],
  { env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
});

test('Classroom service public facade loads under native TypeScript without Nest decorators or database', () => {
  const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(k => process.env[k]).map(k => [k,process.env[k]]));
  const child = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--input-type=module',
    '-e', "import { ClassroomService } from './apps/api/src/classrooms/service.ts'; if (typeof ClassroomService !== 'function') process.exit(2);"],
  { env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
});
