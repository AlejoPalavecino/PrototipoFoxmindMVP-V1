import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('academic access is a structural application contract and transaction mode has one owner', () => {
 const ports = read('apps/api/src/modules/classrooms/application/ports.ts');
 assert.match(ports, /interface ClassroomAccess/);
 assert.doesNotMatch(ports, /ClassroomCore|typeof import/);
 const runner = read('apps/api/src/modules/classrooms/infrastructure/context-run.ts');
 const context = read('apps/api/src/modules/classrooms/infrastructure/context.ts');
 assert.match(runner, /transaction-mode/);
 assert.match(context, /transaction-mode/);
 assert.doesNotMatch(context, /new WeakMap/);
 assert.match(runner, /maxWait: 2000, timeout: 6000/);
});
test('home public surface exposes use cases, with authorized projection in infrastructure', () => {
 const api = read('apps/api/src/modules/home/public.ts');
 assert.match(api, /application\/service/);
 assert.doesNotMatch(api, /infrastructure|presentation|export \*/);
 assert.ok(existsSync('apps/api/src/modules/home/infrastructure/read-port.ts'));
 assert.doesNotMatch(read('apps/api/src/modules/home/application/service.ts'), /\.query\(|node:|infrastructure/);
});
test('foxy lease and budget are independent application contracts', () => {
 const contracts = read('apps/api/src/modules/foxy/application/queue-contracts.ts');
 assert.match(contracts, /FoxyTurnLease/);
 assert.match(contracts, /FoxyTextBudgetConfiguration/);
 assert.doesNotMatch(contracts, /from .*infrastructure|typeof/);
});

test('academic application use cases contain no SQL or concrete runtime dependencies', () => {
 for (const [owner, file] of [['classrooms','drafts'],['classrooms','memberships'],['classrooms','invitations'],['curriculum','plan'],['materials','library'],['materials','library-publication'],['communication','wall'],['study','service'],['study','commands'],['activities','activity-authoring'],['foxy','conversation-service'],['foxy','turn-service'],['foxy','visual-service']]) {
  const source = read(`apps/api/src/modules/${owner}/application/${file}.ts`);
  assert.doesNotMatch(source, /from ['"][^'"]*(?:infrastructure|bootstrap|node:)/, `${owner}/${file} dependencies`);
  assert.doesNotMatch(source, /\.query(?:<[^>]*>)?\(/, `${owner}/${file} SQL`);
 }
});
