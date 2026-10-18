import test from 'node:test';
import assert from 'node:assert/strict';
const policy = () => import('../apps/api/src/classrooms/policy.ts');
const valid = {
  name: 'Fotografía',
  subject: 'Arte',
  division: 'Grupo A',
  academicYear: 2026,
  timezone: 'America/Argentina/Buenos_Aires',
  coverKey: 'explore',
  planFileId: '11111111-1111-4111-8111-111111111111',
  units: [{ name: 'Luz', topics: [{ name: 'Exposición' }] }],
};
test('publication requires all fields, safe identifiers and nonempty curriculum', async () => {
  const { draftPayload } = await policy();
  assert.deepEqual(draftPayload(valid, true), valid);
  for (const key of Object.keys(valid))
    assert.throws(() => draftPayload({ ...valid, [key]: undefined }, true));
  for (const change of [
    { name: ' ' },
    { name: 'a'.repeat(121) },
    { division: 'a'.repeat(61) },
    { academicYear: 0 },
    { academicYear: 2026.5 },
    { timezone: 'UTC-3' },
    { timezone: '+03:00' },
    { coverKey: 'https://evil.test/a' },
    { units: [] },
    { units: [{ name: 'Unit', topics: [] }] },
    { units: [{ name: 'Unit', topics: [{ name: ' ' }] }] },
    { planFileId: 'client-owned-id' },
    { ownerId: '11111111-1111-4111-8111-111111111111' },
  ]) {
    assert.throws(
      () => draftPayload({ ...valid, ...change }, true),
      JSON.stringify(change),
    );
  }
});
test('incomplete drafts remain bounded, support Unicode and reject unknown fields', async () => {
  const { draftPayload } = await policy();
  assert.deepEqual(draftPayload({}, false), {});
  assert.equal(
    draftPayload({ name: '🦊'.repeat(120) }, false).name.length,
    240,
  );
  assert.throws(() => draftPayload({ name: '🦊'.repeat(121) }, false));
  assert.throws(() =>
    draftPayload(
      { units: new Array(101).fill({ name: 'a', topics: [] }) },
      false,
    ),
  );
  assert.throws(() =>
    draftPayload(
      { units: [{ name: 'Unit', topics: [{ name: 'a', role: 'teacher' }] }] },
      false,
    ),
  );
  assert.equal(
    draftPayload({ timezone: 'America/' }, false).timezone,
    'America/',
  );
  assert.throws(() => draftPayload({ ...valid, timezone: 'America/' }, true));
  assert.throws(() =>
    draftPayload(
      {
        units: new Array(6).fill({
          name: 'U',
          topics: new Array(100).fill({ name: 'T' }),
        }),
      },
      false,
    ),
  );
});
test('preview is signed, actor-bound, expiring, size bounded and tamper resistant', async () => {
  const { PreviewTokens } = await policy();
  const tokens = new PreviewTokens(Buffer.alloc(32, 17));
  const data = {
    actor: 'a',
    codeId: 'b',
    digest: 'c',
    classroomId: 'd',
    expires: 2000,
  };
  const token = tokens.issue(data);
  assert.deepEqual(tokens.read(token, 'a', 1000), data);
  for (const [t, actor, now] of [
    [token, 'other', 1000],
    [token, 'a', 2000],
    [token + 'x', 'a', 1000],
    ['x'.repeat(2049), 'a', 1000],
  ])
    assert.throws(() => tokens.read(t, actor, now));
  assert.throws(() => new PreviewTokens(Buffer.alloc(5)));
});
