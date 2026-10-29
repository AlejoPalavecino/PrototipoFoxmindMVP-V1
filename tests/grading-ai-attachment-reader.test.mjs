import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const create = async ports => (await import('../apps/api/src/files/grading-ai-attachment-reader.ts')).createGradingAiAttachmentReader(ports);
const bytes = Buffer.from('documento sintético');
const digest = createHash('sha256').update(bytes).digest('hex');
const grant = { ownerId: 'docente', classroomId: 'aula', attemptId: 'intento', fileId: 'archivo', digest };
const signal = () => new AbortController().signal;
function fixture(extension = 'pdf') {
  let allowed = true, snapshot = { ...grant, extension, approved: true, clean: true }, contents = bytes;
  const calls = { authorizations: 0, snapshots: 0, reads: 0, parses: 0 };
  return { calls, deny: () => { allowed = false; }, change: value => { snapshot = { ...snapshot, ...value }; },
    tamper: () => { contents = Buffer.from('contenido alterado'); },
    ports: { authorize: async g => { calls.authorizations++; if (!allowed || g.ownerId !== grant.ownerId || g.attemptId !== grant.attemptId) throw new Error('FORBIDDEN'); },
      snapshot: async () => { calls.snapshots++; return snapshot; },
      readBytes: async () => { calls.reads++; return contents; },
      parse: async (input, kind) => { calls.parses++; assert.deepEqual(Buffer.from(input), bytes); return { kind, text: 'texto', warnings: [] }; } } };
}

test('lee PDF y DOCX aprobados y asociados al intento con revalidación', async () => {
  for (const extension of ['pdf', 'docx']) {
    const f = fixture(extension), reader = await create(f.ports);
    assert.deepEqual(await reader.read(grant, signal()), { kind: extension, text: 'texto', warnings: [] });
    assert.ok(f.calls.authorizations >= 2); assert.ok(f.calls.snapshots >= 2);
    assert.equal(f.calls.reads, 1); assert.equal(f.calls.parses, 1);
  }
});

test('rechaza docente ajeno y autorización revocada antes de leer bytes', async () => {
  const f = fixture(), reader = await create(f.ports);
  await assert.rejects(reader.read({ ...grant, ownerId: 'ajeno' }, signal()));
  f.deny(); await assert.rejects(reader.read(grant, signal()));
  assert.equal(f.calls.reads, 0);
});

test('rechaza archivo no aprobado, no limpio, ajeno al intento y formato no admitido', async () => {
  for (const change of [{ approved: false }, { clean: false }, { attemptId: 'otro' }, { classroomId: 'otra' }, { fileId: 'otro' }, { extension: 'zip' }]) {
    const f = fixture(), reader = await create(f.ports); f.change(change);
    await assert.rejects(reader.read(grant, signal()));
    assert.equal(f.calls.reads, 0);
  }
});

test('el digest de custodia y bytes debe coincidir antes de procesar', async () => {
  const a = fixture(), reader = await create(a.ports); a.change({ digest: '0'.repeat(64) });
  await assert.rejects(reader.read(grant, signal())); assert.equal(a.calls.reads, 0);
  const b = fixture(), other = await create(b.ports); b.tamper();
  await assert.rejects(other.read(grant, signal())); assert.equal(b.calls.parses, 0);
});

test('una revocación o cambio de custodia durante lectura impide entregar el documento', async () => {
  for (const mode of ['revoke', 'digest', 'attempt', 'file', 'classroom', 'approval']) {
    const f = fixture(); const original = f.ports.readBytes;
    f.ports.readBytes = async (...args) => { const result = await original(...args); if (mode === 'revoke') f.deny(); else if (mode === 'digest') f.change({ digest: '0'.repeat(64) }); else if (mode === 'attempt') f.change({ attemptId: 'otro' }); else if (mode === 'file') f.change({ fileId: 'otro' }); else if (mode === 'classroom') f.change({ classroomId: 'otra' }); else f.change({ approved: false }); return result; };
    const reader = await create(f.ports); await assert.rejects(reader.read(grant, signal()));
  }
});

test('una señal cancelada no accede al contenido', async () => {
  const f = fixture(), reader = await create(f.ports), controller = new AbortController(); controller.abort();
  await assert.rejects(reader.read(grant, controller.signal)); assert.equal(f.calls.reads, 0);
});
