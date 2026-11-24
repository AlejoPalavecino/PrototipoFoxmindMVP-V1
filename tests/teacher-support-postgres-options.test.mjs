import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresServerOptions } from '../scripts/teacher-support-test-runtime.mjs';

test('disposable Postgres keeps its Unix socket inside its own scratch directory outside Windows', () => {
  // Debian/Ubuntu builds default to /var/run/postgresql, which a CI runner user cannot write.
  assert.equal(postgresServerOptions({ port: 54321, socketDirectory: '/tmp/foxmind-teacher-support-abc', platform: 'linux' }),
    '-h 127.0.0.1 -p 54321 -k "/tmp/foxmind-teacher-support-abc"');
  assert.equal(postgresServerOptions({ port: 5433, socketDirectory: '/var/folders/x/T/foxmind-teacher-support-q', platform: 'darwin' }),
    '-h 127.0.0.1 -p 5433 -k "/var/folders/x/T/foxmind-teacher-support-q"');
});

test('disposable Postgres on Windows keeps listening on TCP only, as before', () => {
  assert.equal(postgresServerOptions({ port: 54321, socketDirectory: 'C:\\Temp\\foxmind-teacher-support-abc', platform: 'win32' }),
    '-h 127.0.0.1 -p 54321');
});
