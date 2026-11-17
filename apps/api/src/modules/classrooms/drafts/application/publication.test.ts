import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('settings and publication application own decisions without executing SQL', () => {
  for (const path of ['./drafts-operations.ts', '../../settings/application/settings.ts']) {
    const source = readFileSync(resolve('apps/api/src/modules/classrooms/drafts/application', path), 'utf8');
    assert.doesNotMatch(source, /tx\.query/);
    assert.doesNotMatch(source, /infrastructure\//);
  }
});


import { createDraftPublicationOperations } from './drafts-operations.ts';
import { createSettingsOperations } from '../../settings/public.ts';

const draftId = '11111111-1111-4111-8111-111111111111';
const actor = { id: 'teacher', account_role: 'teacher' };
const payload = { name: 'Classroom', subject: 'Subject', division: 'A', academicYear: 2026,
 timezone: 'America/Buenos_Aires', coverKey: 'biology', planFileId: '22222222-2222-4222-8222-222222222222',
 units: [{ name: 'Unit', topics: [{ name: 'Topic' }] }] };

function publicationFixture(currentRevision = 1n, published: string | null = null) {
 const tx = {};
 const events: string[] = [];
 const check = (seen: unknown) => assert.equal(seen, tx);
 const repository = {
  readSnapshot: async (seen: unknown) => { check(seen); events.push('snapshot'); return [{ payload, revision: 1n, published_classroom_id: published }]; },
  createDestination: async (seen: unknown, input: { quota: bigint }) => { check(seen); assert.equal(input.quota, 100n); events.push('destination'); return []; },
  markPublished: async (seen: unknown) => { check(seen); events.push('mark'); return []; },
  addPlanVersion: async (seen: unknown) => { check(seen); events.push('plan'); return []; },
  addUnit: async (seen: unknown) => { check(seen); events.push('unit'); return []; },
  addTopic: async (seen: unknown) => { check(seen); events.push('topic'); return []; },
 };
 const access = { run: async (_request: unknown, write: boolean, action: Function) => { assert.equal(write, true); return action(tx, actor); },
  draft: async (seen: unknown) => { check(seen); events.push('source-lock'); return { revision: currentRevision, published_classroom_id: null }; },
  ports: { classroomQuotaBytes: 100n, deliveryKey: Buffer.alloc(32), files: { promoteDraftPlanInTransaction: async (seen: unknown) => { check(seen); events.push('promote'); } } } };
 const operations = createDraftPublicationOperations(repository as any, { randomUUID: () => 'new-id',
  newClassroomCode: async seen => { check(seen); events.push('code'); return '123456'; } });
 return { events, publish: () => operations.publishDraftOperation(access as any, {}, draftId, { revision: '1' }) };
}

test('publication preserves destination-before-source, promotion order and one transaction', async () => {
 const f = publicationFixture();
 assert.deepEqual(await f.publish(), { id: 'new-id', code: '123456' });
 assert.deepEqual(f.events, ['snapshot', 'destination', 'source-lock', 'mark', 'promote', 'plan', 'unit', 'topic', 'code']);
});
test('publication conflict prevents file promotion and destination population', async () => {
 const f = publicationFixture(2n);
 await assert.rejects(f.publish(), { code: 'CONFLICT' });
 assert.deepEqual(f.events, ['snapshot', 'destination', 'source-lock']);
});
test('publication replay returns existing classroom without creating a destination', async () => {
 const f = publicationFixture(1n, 'existing');
 assert.deepEqual(await f.publish(), { id: 'existing', code: null });
 assert.deepEqual(f.events, ['snapshot']);
});
test('settings authorize teacher write and reject stale revisions or unavailable AI before update', async () => {
 for (const [revision, available, code] of [[2n, true, 'CONFLICT'], [1n, false, 'SERVICE_UNAVAILABLE'], [1n, true, null]] as const) {
  const tx = {}; let writes = 0;
  const operations = createSettingsOperations({ updateSettings: async (seen, command) => { assert.equal(seen, tx); assert.equal(command.aiGradingEnabled, true); writes++; return []; } });
  const capability = { run: async (_: unknown, write: boolean, action: Function) => { assert.equal(write, true); return action(tx, actor); },
   classroom: async (...args: unknown[]) => { assert.deepEqual(args, [tx, actor, 'room', true, true]); return { revision, ai_grading_enabled: false }; },
   ports: { gradingAiAvailable: available } };
  const call = operations.updateSettingsOperation(capability as any, {}, 'room', { revision: '1', name: 'Classroom', subject: 'Subject', division: 'A', academicYear: 2026, aiGradingEnabled: true });
  if (code) await assert.rejects(call, { code }); else assert.deepEqual(await call, { revision: '2' });
  assert.equal(writes, code ? 0 : 1);
 }
});


import type { DraftsRepository } from './drafts-repository.ts';
import type { SettingsRepository } from '../../settings/application/settings-repository.ts';
import type { InvitationsRepository } from '../../invitations/application/invitations-repository.ts';
import type { Transaction } from '../../access/public.ts';
// Compiled with the API: invalid commands/results must remain rejected by TypeScript.
function verifyRepositoryTypes(drafts: DraftsRepository, settings: SettingsRepository, invitations: InvitationsRepository, tx: Transaction) {
 drafts.lockOwnedDraft(tx, { draftId: 'draft', ownerId: 'teacher' });
 // @ts-expect-error Owner scope is mandatory.
 drafts.lockOwnedDraft(tx, { draftId: 'draft' });
 // @ts-expect-error Consumers cannot choose a return type.
 drafts.listUnpublishedDrafts<{ secret: string }>(tx, { ownerId: 'teacher' });
 // @ts-expect-error Positional persistence arguments are rejected.
 drafts.savePayload(tx, 'draft', '{}');
 // @ts-expect-error Explicit AI grading enablement is boolean or null.
 settings.updateSettings(tx, { classroomId: 'room', name: 'A', subject: 'B', division: 'C', academicYear: 2026, coverKey: null, aiGradingEnabled: 'yes' });
 // @ts-expect-error Invitation matching requires the recipient and actor.
 invitations.lockAcceptableInvitation(tx, { invitationId: 'invite', classroomId: 'room' });
 invitations.listClassroomInvitations(tx, { classroomId: 'room' }).then(rows => {
  const date: Date = rows[0].expiresAt;
  // @ts-expect-error Persisted expiration is a Date, not a string.
  const wrong: string = rows[0].expiresAt;
  void date; void wrong;
 });
}
void verifyRepositoryTypes;
