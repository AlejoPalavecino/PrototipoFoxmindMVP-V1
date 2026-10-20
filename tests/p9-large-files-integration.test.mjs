import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { digest } from './p4-integration-helpers.mjs';
import { representativeMaximumZip } from './p9-positive-max-files.mjs';
import { binaryMaximumZip } from './p9-binary-max-files.mjs';
import { withJourney, ok, request, rootOf, createActivity, startPublic, session, editorHeaders,
  rawUpload, assertReadyFile, rejectUnchanged, academicHash } from './p9-journey-helpers.mjs';

test('P9 actual five distinct exact50000000-byte attachments: valid ZIP/parser/Clam/private hashes/quota/receipt; sixth denied', { timeout: 330000 }, async () => {
  await withJourney('large-files', async world => {
    const { runtime, T, S, room, scratch } = world, root = rootOf(room);
    const evidence = { fixture: 'binary-classroom-stereo-wav-and-lesson-text', publicUploads: [], snapshots: {}, files: [] };
    const flush = () => writeFile(join(scratch, 'safe-capacity-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    // Persist only scoped status/custody/digests, never tokens, storage keys or credentials.
    const capture = async label => {
      try {
        evidence.snapshots[label] = {
          quotaBytes: String(runtime.classroomQuotaBytes),
          usage: (await runtime.db.query(`SELECT COALESCE(SUM(f.size_bytes),0)::text AS used_bytes,
            COALESCE(SUM(u.reserved_bytes),0)::text AS reserved_bytes FROM files f LEFT JOIN uploads u ON u.file_id=f.id
            WHERE f.classroom_id=$1::uuid AND f.blob_deleted_at IS NULL
            AND (u.id IS NULL OR u.status='COMPLETED' OR u.reservation_released_at IS NULL)`, [room.id])).rows[0],
          files: (await runtime.db.query(`SELECT f.id,f.size_bytes::text,f.extension,f.detected_mime_type,
            f.validation_status::text,f.scan_status::text,f.rejection_code,(f.validated_at IS NOT NULL) AS validated,
            (f.scanned_at IS NOT NULL) AS scanned,(f.blob_deleted_at IS NOT NULL) AS blob_deleted,
            u.status::text AS upload_status,u.reserved_bytes::text,(u.reservation_released_at IS NOT NULL) AS reservation_released,
            c.phase,c.digest,c.validated_digest,c.scanned_digest
            FROM files f LEFT JOIN uploads u ON u.file_id=f.id LEFT JOIN file_custodies c ON c.file_id=f.id
            WHERE f.classroom_id=$1::uuid ORDER BY f.id`, [room.id])).rows,
          attempts: (await runtime.db.query(`SELECT a.id,a.status::text,a.revision::text,
            (SELECT count(*)::int FROM attempt_attachments WHERE attempt_id=a.id) AS attachment_count
            FROM attempts a JOIN activities x ON x.id=a.activity_id WHERE x.classroom_id=$1::uuid ORDER BY a.id`, [room.id])).rows,
          academicHash: await academicHash(runtime.db),
        };
      } catch (error) { evidence.snapshots[label] = { unavailable: { name: error.name, code: error.code ?? 'CAPTURE_UNAVAILABLE' } }; }
      await flush();
    };
    const safePublic = body => body?.error ? { error: { code: body.error.code } }
      : { id: body?.id, ready: body?.ready, validation: body?.validation, scan: body?.scan, sizeBytes: body?.sizeBytes };
    await flush();
    try {
      evidence.ownedServices = runtime.inspectServices(); await capture('beforeIntent');
      assert.ok(!evidence.snapshots.beforeIntent.unavailable, 'Safe scoped SQL evidence must be available');
      assert.equal(runtime.classroomQuotaBytes, 300000000n);
      const usage = async () => BigInt((await runtime.db.query(`SELECT COALESCE(SUM(f.size_bytes),0)::text AS used FROM files f
        LEFT JOIN uploads u ON u.file_id=f.id WHERE f.classroom_id=$1 AND f.blob_deleted_at IS NULL
        AND (u.id IS NULL OR u.status='COMPLETED' OR u.reservation_released_at IS NULL)`, [room.id])).rows[0].used);
      const existingUsage = await usage(); assert.ok(existingUsage > 0n);
      assert.ok(existingUsage + 250000000n <= runtime.classroomQuotaBytes, 'Observed existing plan/material/attempt usage must fit');
      const activity = await createActivity(world, 'ASSIGNMENT', { attachmentRequired: true }), started = await startPublic(world, activity);
      const attemptId = started.attempt.id, editor = started.editor, files = [];
      for (let index = 0; index < 5; index++) {
        const bytes = binaryMaximumZip(index), expected = digest(bytes), name = `max-${index + 1}.zip`;
        evidence.files.push({ index, name, size: bytes.length, sha256: expected }); await flush();
        assert.equal(bytes.length, 50_000_000); await writeFile(join(scratch, name), bytes);
        const allocated = await request(S.page, 'POST', '/files', { scope: { kind: 'classroom', id: room.id }, purpose: 'attachment',
          targetId: attemptId, name, bytes: bytes.length }, editorHeaders(editor));
        evidence.intent = { index, status: allocated.status, json: safePublic(allocated.body) };
        evidence.lastFileId = allocated.body?.id;
        await capture(`intent${index + 1}`); assert.equal(allocated.status, 201);
        assert.equal(await usage(), existingUsage + BigInt((index + 1) * 50_000_000), 'Pending bytes reserve quota');
        const uploaded = await rawUpload(S.page, runtime.origin, allocated.body.id, bytes, editor);
        evidence.publicUploads.push({ index, id: allocated.body.id, status: uploaded.status, json: safePublic(uploaded.body) });
        await capture(`upload${index + 1}`);
        assert.ok(!evidence.snapshots[`upload${index + 1}`].unavailable, 'Post-upload status/digests must be retained');
        assert.equal(uploaded.status, 200); assert.equal(uploaded.body.ready, true);
        await assertReadyFile(runtime, allocated.body.id, bytes.length, expected);
        const content = await request(S.page, 'GET', `/files/${allocated.body.id}/content`);
        assert.equal(content.status, 200); assert.equal(content.length, 50_000_000); assert.equal(content.digest, expected);
        files.push({ id: allocated.body.id, digest: expected });
        evidence.approvedCount = files.length; await flush();
        if (index === 0) console.log('P9 first maximum file gate PASS: actual200/APPROVED/CLEAN/ready/expected=validated=scanned=private=download SHA256; files2-5 may proceed');
        console.log(`P9 capacity file${index + 1}: 50000000 bytes actual APPROVED/CLEAN/ready and private/public SHA256 match`);
      }
      assert.equal(new Set(files.map(file => file.id)).size, 5); assert.equal(new Set(files.map(file => file.digest)).size, 5);
      assert.equal(await usage(), existingUsage + 250000000n);
      let state = await session(world, activity); assert.equal(state.attempt.attachments.length, 5); assert.equal(state.attempt.status, 'DRAFT');
      assert.ok(state.attempt.attachments.every(row => row.ready && row.selected && row.sizeBytes === '50000000'));
      const sixthBytes = representativeMaximumZip(0, 4096);
      assert.ok(runtime.classroomQuotaBytes - await usage() >= BigInt(sixthBytes.length), 'The sixth valid small ZIP must fit remaining quota');
      await writeFile(join(scratch, 'rejected-sixth.zip'), sixthBytes);
      const sixth = await rejectUnchanged(runtime.db, () => request(S.page, 'POST', '/files', {
        scope: { kind: 'classroom', id: room.id }, purpose: 'attachment', targetId: attemptId, name: 'sixth.zip', bytes: sixthBytes.length }, editorHeaders(editor)), 409);
      assert.equal(sixth.body.error.code, 'UPLOAD_CONFLICT');
      evidence.sixth = { status: sixth.status, json: safePublic(sixth.body), size: sixthBytes.length }; await capture('sixthRejected');
      assert.deepEqual((await session(world, activity)).attempt.attachments, state.attempt.attachments);
      await ok(S.page, 'POST', `${root}/attempts/${attemptId}/submit-practical`, { revision: state.attempt.revision, confirm: true }, editorHeaders(editor));
      state = await session(world, activity); assert.equal(state.attempt.status, 'SUBMITTED'); assert.equal(state.attempt.attachments.length, 5);
      const receipt = await ok(T.page, 'GET', `${root}/attempts/${attemptId}/receipt`); assert.equal(receipt.id, attemptId);
      evidence.receipt = { id: receipt.id, explicitConfirm: true, status: state.attempt.status }; await flush();
      for (const file of files) {
        const content = await request(T.page, 'GET', `/files/${file.id}/content`);
        assert.equal(content.status, 200); assert.equal(content.length, 50_000_000); assert.equal(content.digest, file.digest);
      }
      const persisted = await academicHash(runtime.db); await runtime.restartData(); assert.equal(await academicHash(runtime.db), persisted);
      for (const file of files) await assertReadyFile(runtime, file.id, 50_000_000, file.digest);
      assert.equal((await session(world, activity)).attempt.attachments.length, 5);
      evidence.outcome = 'FIVE_MAXIMUM_FILES_CAPACITY_VERIFIED'; await capture('afterRestart');
      console.log('P9 capacity verified private/public SHA256 records', JSON.stringify(files));
      console.log(`P9 capacity: existing=${existingUsage} attachmentbytes=250000000 total=${await usage()} quota=300000000 sixthrowdenied fivepreserved restart PASS`);
    } catch (error) {
      evidence.failure = { name: error.name, code: error.code ?? 'CAPACITY_ASSERTION_FAILED' };
      if (evidence.lastFileId) {
        try {
          const status = await request(S.page, 'GET', `/files/${evidence.lastFileId}`);
          evidence.publicFileStatus = { status: status.status, json: safePublic(status.body) };
        } catch (statusError) { evidence.publicFileStatus = { unavailable: { name: statusError.name, code: statusError.code ?? 'STATUS_UNAVAILABLE' } }; }
      }
      await capture('failureBeforeCleanup');
      console.error('P9 safe capacity failure evidence retained', JSON.stringify({ scratch, failure: evidence.failure,
        publicUploads: evidence.publicUploads, publicFileStatus: evidence.publicFileStatus,
        snapshot: evidence.snapshots.failureBeforeCleanup }));
      throw error;
    } finally { await capture('beforeOwnedCleanup'); }
  }, { classroomQuotaBytes: 300000000 });
});
