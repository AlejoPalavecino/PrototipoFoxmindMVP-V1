import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { createConnection } from 'node:net';
import { Worker } from 'node:worker_threads';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom } from './p6-integration-helpers.mjs';
import { maximumZip, academicTables } from './p9-journey-helpers.mjs';
import { tableHash } from './p8-grading-helpers.mjs';

const expectedDigest = '38fcfd4c64ece7337042588347323c44dffd024ded25271544751de7a240c8dc';
const safeError = error => ({ name: error?.name ?? 'Error', code: error?.code ?? 'DIAGNOSTIC_UNAVAILABLE' });
const safeOutput = value => /(?:password|secret|token|https?:|@)/i.test(value) ? '[redacted diagnostic text]' : value.slice(0, 4096);
function safePublic(body) {
  if (!body || typeof body !== 'object') return { parsed: true, shape: typeof body };
  if (body.error) return { error: { code: typeof body.error.code === 'string' ? body.error.code : null } };
  return Object.fromEntries(['id', 'sizeBytes', 'ready', 'upload', 'validation', 'scan', 'rejectionCode']
    .filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
}

/** Exactly one public upload; bytes traverse Next with the real browser session/CSRF/editor binding. */
async function rawOnce(page, origin, fileId, bytes, editor) {
  const csrf = await api(page, 'GET', '/auth/csrf');
  assert.equal(csrf.status, 200, 'Real CSRF prerequisite');
  const cookie = (await page.context().cookies()).map(row => `${row.name}=${row.value}`).join('; ');
  const start = Date.now();
  return new Promise(resolve => {
    let settled = false;
    const finish = result => {
      if (settled) return; settled = true; clearTimeout(timer);
      resolve({ method: 'PUT', path: `/api/v1/files/${fileId}/content`, bytes: bytes.length, elapsedMs: Date.now() - start, ...result });
    };
    const request = httpRequest(`${origin}/api/v1/files/${fileId}/content`, { method: 'PUT', headers: {
      cookie, origin, 'x-csrf-token': csrf.body.csrfToken, 'x-attempt-editor': editor.token, 'x-attempt-epoch': editor.epoch,
      'content-type': 'application/octet-stream', 'content-length': String(bytes.length),
    } }, response => {
      const chunks = []; let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > 16384) { finish({ status: response.statusCode, complete: false, error: 'METADATA_LIMIT' }); response.destroy(); }
        else chunks.push(chunk);
      });
      response.on('error', error => finish({ status: response.statusCode, complete: false, error: safeError(error) }));
      response.on('end', () => {
        try { finish({ status: response.statusCode, complete: true, json: safePublic(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }); }
        catch { finish({ status: response.statusCode, complete: true, error: 'NON_JSON_RESPONSE' }); }
      });
    });
    const timer = setTimeout(() => { finish({ complete: false, error: 'UPSTREAM_EXCHANGE_TIMEOUT' }); request.destroy(); }, 60000);
    request.on('error', error => finish({ complete: false, error: safeError(error) }));
    request.end(bytes);
  });
}

/** Same native zINSTREAM framing, 65536-byte chunks, backpressure and 15s bound; never changes application state. */
async function scanOnce(endpoint, bytes) {
  assert.equal(endpoint.host, '127.0.0.1'); assert.equal(endpoint.paused, false);
  const start = Date.now();
  return new Promise(resolve => {
    let response = Buffer.alloc(0), settled = false, sent = false, offset = 0;
    const socket = createConnection({ host: endpoint.host, port: endpoint.port });
    const finish = result => {
      if (settled) return; settled = true; clearTimeout(timer); socket.destroy();
      resolve({ protocol: 'zINSTREAM', timeoutMs: 15000, elapsedMs: Date.now() - start, bytesSent: offset, sent, ...result });
    };
    const timer = setTimeout(() => finish({ outcome: 'timeout' }), 15000);
    socket.on('error', error => finish({ outcome: 'connection-error', error: safeError(error) }));
    socket.on('close', () => { if (!settled) finish({ outcome: 'closed-without-verdict' }); });
    socket.on('data', chunk => {
      response = Buffer.concat([response, chunk]);
      if (!sent || response.length > 4096) return finish({ outcome: 'invalid-response' });
      const end = response.indexOf(0); if (end < 0) return;
      if (end !== response.length - 1) return finish({ outcome: 'invalid-response' });
      const verdict = response.subarray(0, end).toString('utf8');
      const outcome = verdict === 'stream: OK' ? 'clean' : /^stream: [^\r\n\u0000]+ FOUND$/.test(verdict) ? 'found' : 'unavailable';
      finish({ outcome, verdict: safeOutput(verdict) });
    });
    socket.once('connect', () => {
      socket.write('zINSTREAM\0');
      const send = () => {
        while (!settled && offset < bytes.length) {
          const chunk = bytes.subarray(offset, offset + 65536); offset += chunk.length;
          const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length); socket.write(size);
          if (!socket.write(chunk)) { socket.once('drain', send); return; }
        }
        if (!settled) { sent = true; socket.write(Buffer.alloc(4)); }
      };
      send();
    });
  });
}

/** Exact existing product worker and resource options from files/content.ts, not a rewritten parser. */
async function parseOnce(bytes) {
  const start = Date.now(), output = { stdout: '', stderr: '' };
  const worker = new Worker(new URL("../.build/api/apps/api/src/modules/files/infrastructure/content-worker.js", import.meta.url), {
    workerData: { bytes, extension: 'zip' }, execArgv: [],
    resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }, stdout: true, stderr: true,
  });
  worker.stdout.on('data', chunk => { output.stdout = (output.stdout + chunk.toString()).slice(0, 4096); });
  worker.stderr.on('data', chunk => { output.stderr = (output.stderr + chunk.toString()).slice(0, 4096); });
  let timer;
  try {
    return await new Promise(resolve => {
      const finish = async result => {
        clearTimeout(timer); const exitCode = await worker.terminate();
        resolve({ worker: ".build/api/apps/api/src/modules/files/infrastructure/content-worker.js", execArgv: [], timeoutMs: 15000,
          resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
          elapsedMs: Date.now() - start, exitCode, stdout: safeOutput(output.stdout), stderr: safeOutput(output.stderr), ...result });
      };
      let settled = false;
      const once = result => { if (!settled) { settled = true; void finish(result); } };
      timer = setTimeout(() => once({ outcome: 'timeout' }), 15000);
      worker.once('message', result => once(result?.ok === true && typeof result.mime === 'string'
        ? { outcome: 'accepted', message: { ok: true, mime: result.mime } }
        : { outcome: 'rejected', message: { ok: false }, reason: 'Native worker deliberately does not expose its caught exception' }));
      worker.once('error', error => once({ outcome: 'worker-error', error: safeError(error) }));
      worker.once('exit', code => once({ outcome: 'exited-without-message', nativeExitCode: code }));
    });
  } finally { clearTimeout(timer); await worker.terminate(); }
}

test('P9 isolated same50000000-byte diagnostic retains public rejection, scoped SQL and bounded native safety verdicts', { timeout: 330000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p9-max-file-diagnostic-'));
  console.log(`P9 max-file diagnostic retained evidence: ${scratch}`);
  const bytes = maximumZip(0), evidence = { diagnosticOnly: true, capacityAcceptance: false, publicUploadCount: 0,
    fixture: { size: bytes.length, sha256: digest(bytes), storedEntryBytes: bytes.readUInt32LE(18), crc32: bytes.readUInt32LE(14) },
    limits: { testMs: 330000, childMs: 360000, publicExchangeMs: 60000, scannerMs: 15000, parserMs: 15000, parserOldHeapMiB: 128 },
    snapshots: {}, responses: [], errors: [] };
  const flush = () => writeFile(join(scratch, 'safe-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  const capture = async (label, run) => {
    try { evidence.snapshots[label] = await run(); }
    catch (error) { evidence.snapshots[label] = { unavailable: safeError(error) }; }
    await flush(); return evidence.snapshots[label];
  };
  await flush(); assert.equal(bytes.length, 50000000); assert.equal(digest(bytes), expectedDigest);
  await writeFile(join(scratch, 'same-max-1.zip'), bytes);
  try {
    await withP4IntegrationRuntime(async runtime => {
      const browser = await chromium.launch({ headless: true }), pages = [], pendingResponses = new Set();
      let room, attemptId, fileId;
      const snapshot = async () => {
        if (!room || !attemptId) return { preparationIncomplete: true };
        const usage = (await runtime.db.query(`SELECT COALESCE(SUM(f.size_bytes),0)::text AS used_bytes,
          COALESCE(SUM(u.reserved_bytes),0)::text AS reserved_bytes FROM files f LEFT JOIN uploads u ON u.file_id=f.id
          WHERE f.classroom_id=$1::uuid AND f.blob_deleted_at IS NULL
          AND (u.id IS NULL OR u.status='COMPLETED' OR u.reservation_released_at IS NULL)`, [room.id])).rows[0];
        const attempt = (await runtime.db.query(`SELECT id,activity_id,status::text,attempt_number,revision::text,editor_epoch::text,
          (SELECT count(*)::int FROM attempt_attachments WHERE attempt_id=a.id) AS attachment_count
          FROM attempts a WHERE id=$1::uuid`, [attemptId])).rows[0];
        const file = fileId ? (await runtime.db.query(`SELECT f.id,f.classroom_id,f.size_bytes::text,f.extension,f.detected_mime_type,
          f.validation_status::text,f.scan_status::text,f.rejection_code,(f.validated_at IS NOT NULL) AS validated,
          (f.scanned_at IS NOT NULL) AS scanned,(f.blob_deleted_at IS NOT NULL) AS blob_deleted,u.status::text AS upload_status,
          u.reserved_bytes::text,(u.reservation_released_at IS NOT NULL) AS reservation_released,c.purpose,c.target_id,c.phase,
          c.digest,c.validated_digest,c.scanned_digest,(c.lease_until IS NOT NULL) AS lease_present
          FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
          WHERE f.id=$1::uuid AND f.classroom_id=$2::uuid`, [fileId, room.id])).rows[0] : null;
        // Failed validation legitimately changes its own file/custody/lease rows, not unrelated academic records.
        const unrelatedAcademicHash = await tableHash(runtime.db, academicTables.filter(table => !['files', 'uploads', 'file_custodies'].includes(table)));
        return { quota_bytes: String(runtime.classroomQuotaBytes), usage, attempt, file, unrelatedAcademicHash };
      };
      const newPage = async role => {
        const context = await browser.newContext(), page = await context.newPage(); pages.push(page); page.setDefaultTimeout(12000);
        page.on('pageerror', () => evidence.errors.push({ kind: 'page-error' }));
        page.on('requestfailed', request => {
          const path = new URL(request.url()).pathname;
          if (path.startsWith('/api/v1/')) evidence.responses.push({ method: request.method(), path, failed: true });
        });
        page.on('response', response => {
          const path = new URL(response.url()).pathname; if (!path.startsWith('/api/v1/')) return;
          const row = { method: response.request().method(), path, status: response.status(), complete: false }; evidence.responses.push(row);
          const pending = response.finished().then(error => { row.complete = !error; });
          pendingResponses.add(pending); void pending.finally(() => pendingResponses.delete(pending));
        });
        await account(page, runtime.origin, runtime.inbox, `p9-max-diagnostic-${role}-${Date.now()}@example.test`, undefined, role);
        return page;
      };
      const public200 = async (page, method, path, body) => {
        const response = await api(page, method, path, body);
        assert.equal(response.status, 200, `${method} ${path} prerequisite: ${response.body?.error?.code ?? ''}`); return response.body;
      };
      try {
        const teacher = await newPage('teacher'), student = await newPage('student');
        room = await classroom(teacher, student, 'P9 isolated maximum diagnostic'); const root = `/classrooms/${room.id}`;
        const detail = () => public200(teacher, 'GET', root);
        const change = async operation => public200(teacher, 'POST', `${root}/activities`, { revision: (await detail()).revision, operation });
        const created = await change({ action: 'create', type: 'ASSIGNMENT' }), state = await detail();
        await change({ action: 'save', id: created.id, payload: { title: 'One-file diagnostic only', unitId: state.units[0].id,
          topicId: state.units[0].topics[0].id, instructions: 'Same-byte diagnostic prerequisite', attachmentRequired: true,
          instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: [] } });
        await change({ action: 'publish', id: created.id });
        const started = await public200(student, 'POST', `${root}/activities/${created.id}/start`, {});
        attemptId = started.attempt.id;
        evidence.binding = { classroomId: room.id, activityId: created.id, attemptId, epoch: started.editor.epoch,
          editorPresent: typeof started.editor.token === 'string' && started.editor.token.length === 43,
          attemptEpochMatches: started.editor.epoch === started.attempt.epoch };
        await capture('ownedServices', async () => runtime.inspectServices());
        const before = await capture('beforeIntent', snapshot);
        assert.equal(before.quota_bytes, '300000000'); assert.equal(before.attempt.status, 'DRAFT');
        assert.ok(BigInt(before.usage.used_bytes) + 250000000n <= 300000000n);
        const headers = { 'x-attempt-editor': started.editor.token, 'x-attempt-epoch': started.editor.epoch };
        const allocated = await api(student, 'POST', '/files', { scope: { kind: 'classroom', id: room.id }, purpose: 'attachment',
          targetId: attemptId, name: 'max-1.zip', bytes: bytes.length }, headers);
        evidence.intent = { status: allocated.status, json: safePublic(allocated.body) }; fileId = allocated.body?.id; await flush();
        const reserved = await capture('afterIntent', snapshot);
        assert.equal(allocated.status, 201); assert.ok(fileId); assert.equal(reserved.file.size_bytes, '50000000');
        assert.equal(BigInt(reserved.usage.used_bytes), BigInt(before.usage.used_bytes) + 50000000n);
        try {
          evidence.publicUploadCount++; await flush();
          evidence.publicUpload = await rawOnce(student, runtime.origin, fileId, bytes, started.editor);
        } catch (error) { evidence.publicUpload = { complete: false, error: safeError(error) }; }
        finally { await flush(); await capture('afterPublicUpload', snapshot); }
        const after = evidence.snapshots.afterPublicUpload;
        if (evidence.publicUpload.status !== 200) {
          await capture('directScanner', async () => scanOnce(runtime.inspectServices().scanner, bytes));
          if (after.file?.validation_status === 'REJECTED') await capture('nativeParser', async () => parseOnce(bytes));
        } else {
          await capture('privateBytes', async () => { const stored = await runtime.privateFileBytes(fileId); return { size: stored.length, sha256: digest(stored) }; });
          const download = await api(student, 'GET', `/files/${fileId}/content`);
          evidence.authorizedDownload = { status: download.status, size: download.length, sha256: download.digest }; await flush();
        }
        const status = await api(student, 'GET', `/files/${fileId}`);
        evidence.publicFileStatus = { status: status.status, json: safePublic(status.body) }; await flush();
        assert.equal(evidence.publicUploadCount, 1); assert.equal(evidence.publicUpload.complete, true);
        assert.equal(status.status, 200); assert.ok(!after.unavailable, 'Post-response SQL must be retained');
        if (evidence.publicUpload.status === 422) {
          assert.equal(evidence.publicUpload.json?.error?.code, 'FILE_REJECTED');
          assert.equal(status.body.ready, false); assert.equal(after.attempt.status, 'DRAFT');
          assert.equal(after.attempt.attachment_count, 0); assert.equal(after.file.phase, 'rejected');
          assert.equal(after.unrelatedAcademicHash, before.unrelatedAcademicHash);
          evidence.outcome = 'REJECTION_DIAGNOSIS_CAPTURED_NOT_CAPACITY_ACCEPTANCE';
        } else if (evidence.publicUpload.status === 200) {
          assert.equal(status.body.ready, true); assert.equal(after.file.validation_status, 'APPROVED');
          assert.equal(after.file.scan_status, 'CLEAN'); assert.equal(after.file.upload_status, 'COMPLETED');
          assert.equal(after.file.phase, 'ready'); assert.equal(after.attempt.attachment_count, 1);
          for (const field of ['digest', 'validated_digest', 'scanned_digest']) assert.equal(after.file[field], expectedDigest);
          assert.deepEqual(evidence.snapshots.privateBytes, { size: 50000000, sha256: expectedDigest });
          assert.deepEqual(evidence.authorizedDownload, { status: 200, size: 50000000, sha256: expectedDigest });
          evidence.outcome = 'ONE_FILE_ACCEPTED_NOT_FIVE_FILE_CAPACITY';
        } else assert.fail(`Public diagnostic unavailable or unexpected: ${evidence.publicUpload.status ?? 'no-response'}`);
        assert.deepEqual(evidence.errors, []); await flush();
        console.log('P9 maximum-file diagnostic outcome', evidence.outcome);
        console.log('P9 maximum-file safe public response', JSON.stringify(evidence.publicUpload));
        console.log('P9 maximum-file post-response SQL', JSON.stringify(after));
        console.log('P9 maximum-file safety probes', JSON.stringify({ scanner: evidence.snapshots.directScanner, parser: evidence.snapshots.nativeParser }));
      } finally {
        await capture('beforeOwnedCleanup', snapshot);
        evidence.applicationAlerts = [];
        for (const [index, page] of pages.entries()) {
          const alerts = await capture(`alerts${index}`, async () => page.getByRole('alert').evaluateAll(nodes => nodes.map(node => ({
            tag: node.tagName, id: node.id, live: node.getAttribute('aria-live'), text: node.textContent,
            framework: node.tagName === 'P' && node.id === '__next-route-announcer__' && node.getAttribute('aria-live') === 'assertive',
          }))));
          if (Array.isArray(alerts)) evidence.applicationAlerts.push(...alerts.filter(row => !row.framework));
        }
        await browser.close(); await Promise.allSettled([...pendingResponses]); await flush();
      }
    }, { classrooms: true, classroomQuotaBytes: 300000000 });
    assert.deepEqual(evidence.applicationAlerts, [], 'Unknown application alerts are not Next route announcements');
  } catch (error) { evidence.failure = safeError(error); await flush(); throw error; }
});
