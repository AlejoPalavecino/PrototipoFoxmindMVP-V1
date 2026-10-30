import { migrationInventory } from './helpers/migration-inventory.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Frozen pre-feature Git LF bytes; checkout CRLF is the only canonicalized difference.
const historical = [
  ['202610150001_initial', '2ee047f36d88f7457c8305c25f54797fbb5580b26e16ee80915ed269ef929670'],
  ['202610150002_invariants', 'd0df8e8e9dfddfefc7850b74ccefca2f854469d228dd454fb4f961e5695ffba8'],
  ['202610150003_guard_regressions', '1c1d3bec3cd647718c08fb796c46de4b54616b9c10a27be85fa20f040995083e'],
  ['202610160001_file_custody', '694b71ede22e22335bb5497a2e0652548ae6810fe9534d0b07f193c1a4404f2b'],
  ['202610160002_custody_proof_guards', '474664d0ff1d27ba00cf5da6f281fc7e4167e27d2d1a2c14cb105238cb2adcf5'],
  ['202610160003_draft_plan_promotion', '8c23a36636d7f13f3769091866605066d3d276ae1db68e822ab950fb11b37f25'],
  ['202610170001_p5_classroom_revision', 'f2dc6069d866751a2872f1132343861307a2592a36743380acda33e7ac71ad50'],
  ['202610180001_p6_library_lifecycle', '7d7f86bac60623049ab6cbfac48f909c3d1f91376c1ea7082345d1e726df4905'],
  ['202610180002_p8_pending_question_scores', '655b0cab49274d4878433450f12035cb588351b236a2c410816022c3799db8fc'],
  ['202610230001_agenda_events', '2a8808563bc1fbc987932a9eb469ea30545fe355b5bf6b3affe757e44edd807a'],
  ['202610230001_classroom_ai', 'eedce58260acdf702c0ff384b603743065f4a7dd64294207ab93e956458b5caf'],
  ['202610240001_agenda_event_color', 'e73a3582284512cf7ede7b9d497d48e10632fdd8e7ff133905a819c39e17dd3f'],
];
const canonicalDigest = bytes => createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
test('activity and recurrence migrations append without rewriting the twelve historical SQL files', async () => {
  const names = (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name)).sort();
  assert.deepEqual(names, migrationInventory);
  assert.deepEqual(names.slice(0, historical.length), historical.map(([name]) => name));
  for (const [name, digest] of historical) {
    const bytes = await readFile(`prisma/migrations/${name}/migration.sql`);
    assert.equal(canonicalDigest(bytes), digest, name);
  }
});

test('historical SQL hashes accept LF and CRLF checkouts while rejecting other content changes', async () => {
  for (const [name, digest] of historical) {
    const lf = (await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(canonicalDigest(Buffer.from(lf)), digest, `${name} LF`);
    assert.equal(canonicalDigest(Buffer.from(lf.replace(/\n/g, '\r\n'))), digest, `${name} CRLF`);
    assert.notEqual(canonicalDigest(Buffer.from(lf + ' ')), digest, `${name} SQL whitespace is preserved`);
  }
});
