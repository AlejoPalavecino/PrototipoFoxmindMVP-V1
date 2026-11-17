import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('academic access is a structural application contract and transaction mode has one owner', () => {
 const ports = read('apps/api/src/modules/classrooms/access/application/ports.ts');
 assert.match(ports, /interface ClassroomAccess/);
 assert.doesNotMatch(ports, /ClassroomCore|typeof import/);
 const runner = read('apps/api/src/modules/classrooms/access/infrastructure/context-run.ts');
 const context = read('apps/api/src/modules/classrooms/access/infrastructure/context.ts');
 assert.match(runner, /transaction-mode/);
 assert.match(context, /transaction-mode/);
 assert.doesNotMatch(context, /new WeakMap/);
 assert.match(runner, /maxWait: 2000, timeout: 6000/);
});
test('home public surface exposes use cases, with authorized projection in infrastructure', () => {
 const api = read('apps/api/src/modules/home/public.ts');
 assert.match(api, /dashboard\/public/);
 assert.match(read('apps/api/src/modules/home/dashboard/public.ts'), /application\/service/);
 assert.doesNotMatch(api, /infrastructure|presentation|export \*/);
 assert.ok(existsSync('apps/api/src/modules/home/dashboard/infrastructure/read-port.ts'));
 assert.doesNotMatch(read('apps/api/src/modules/home/dashboard/application/service.ts'), /\.query\(|node:|infrastructure/);
});
test('foxy lease and budget are independent application contracts', () => {
 const contracts = read('apps/api/src/modules/foxy/turns/application/queue-contracts.ts');
 assert.match(contracts, /FoxyTurnLease/);
 assert.match(contracts, /FoxyTextBudgetConfiguration/);
 assert.doesNotMatch(contracts, /from .*infrastructure|typeof/);
});

test('academic application use cases contain no SQL or concrete runtime dependencies', () => {
 for (const file of [
  'apps/api/src/modules/classrooms/drafts/application/drafts.ts',
  'apps/api/src/modules/classrooms/memberships/application/memberships.ts',
  'apps/api/src/modules/classrooms/invitations/application/invitations.ts',
  'apps/api/src/modules/curriculum/plan/application/plan.ts',
  'apps/api/src/modules/materials/library/application/library.ts',
  'apps/api/src/modules/materials/publication/application/library-publication.ts',
  'apps/api/src/modules/communication/wall/application/wall.ts',
  'apps/api/src/modules/study/folders/application/service.ts',
  'apps/api/src/modules/study/folders/application/commands.ts',
  'apps/api/src/modules/activities/authoring/application/activity-authoring.ts',
  'apps/api/src/modules/foxy/conversations/application/conversation-service.ts',
  'apps/api/src/modules/foxy/turns/application/turn-service.ts',
  'apps/api/src/modules/foxy/visuals/application/visual-service.ts',
 ]) {
  const source = read(file);
  assert.doesNotMatch(source, /from ['"][^'"]*(?:infrastructure|bootstrap|node:)/, `${file} dependencies`);
  assert.doesNotMatch(source, /\.query(?:<[^>]*>)?\(/, `${file} SQL`);
 }
});
