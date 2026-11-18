import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { withJourney, rootOf, academicHash, capturedInvitation, ok } from './p9-journey-helpers-current.mjs';
import { openClassroom } from './p6-integration-helpers.mjs';
import { observedUiAction } from './p8-current-ui-helpers.mjs';
import { assertMailpitContinuity } from '../scripts/p9-runtime-controls.mjs';

test('P9 first actual invitation SMTP failure and natural retry recovery', { timeout: 330000 }, async () => {
  await withJourney('mail-recovery', async world => {
    const { runtime, T, room, scratch } = world, page = T.page;
    const recipient = `p9-mail-recovery-new-${Date.now()}@example.test`;
    const evidence = { recipient, observations: [] };
    const flush = () => writeFile(join(scratch, 'safe-mail-recovery.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    let invitation;
    const job = async () => (await runtime.db.query(`SELECT id,type,status::text,attempt_count,available_at,updated_at,
      completed_at,last_error_code,payload->>'invitationId' AS invitation_id,payload->>'generation' AS generation
      FROM background_jobs WHERE type='p5.invitation' AND payload->>'invitationId'=$1
      AND payload->>'generation'=$2`, [invitation.id, invitation.generation])).rows[0];
    const awaitJob = async (label, match, budget) => {
      const deadline = Date.now() + budget;
      while (Date.now() < deadline) {
        const row = await job(); evidence.observations.push({ at: new Date().toISOString(), label, row }); await flush();
        if (row && match(row)) return row;
        await delay(2000);
      }
      assert.fail(`Natural invitation worker ${label} not observed within bounded window`);
    };
    const reenter = async label => {
      const suffixes = ['', '/members', '/history', '/invitations'];
      const read = suffix => page.waitForResponse(response =>
        new URL(response.url()).pathname === `/api/v1${rootOf(room)}${suffix}` && response.request().method() === 'GET');
      const detailRead = read('');
      void detailRead.catch(() => {});
      await openClassroom(page, runtime.origin, `P9 ${world.label} classroom`);
      const detailResponse = await detailRead;
      const historyRead = read('/history');
      void historyRead.catch(() => {});
      await page.getByRole('button', { name: 'Historial', exact: true }).click();
      const historyResponse = await historyRead;
      const memberReads = Promise.all([read('/members'), read('/invitations')]);
      void memberReads.catch(() => {});
      await page.getByRole('button', { name: 'Estudiantes', exact: true }).click();
      const [memberResponse, invitationResponse] = await memberReads;
      const responses = [detailResponse, memberResponse, historyResponse, invitationResponse];
      const bodies = await Promise.all(responses.map(async response => {
        assert.equal(response.status(), 200, 'Public classroom reentry must load actual admitted state');
        assert.equal(await response.finished(), null); return response.json();
      }));
      assert.equal(bodies[0].id, room.id);
      for (const body of bodies.slice(1)) assert.ok(Array.isArray(body));
      const current = bodies[3].find(row => row.id === invitation.id && row.generation === invitation.generation);
      assert.ok(current, 'The exact invitation must be in the completed public list');
      evidence.observations.push({ at: new Date().toISOString(), label,
        reads: suffixes.map((suffix, index) => ({ suffix, status: responses[index].status() })),
        invitation: { id: current.id, generation: current.generation, deliveryStatus: current.deliveryStatus, deliveryError: current.deliveryError } });
      await flush(); return current;
    };
    try {
      evidence.servicesBefore = runtime.inspectServices(); evidence.mailBefore = await runtime.inspectMail();
      evidence.bindingsBefore = await runtime.inspectMailBindings(); await flush();
      const membersBefore = (await runtime.db.query('SELECT count(*)::int n FROM membership_periods')).rows[0].n;
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM users WHERE email_normalized=$1', [recipient])).rows[0].n, 0);
      await openClassroom(page, runtime.origin, `P9 ${world.label} classroom`);
      const batchPath = `/api/v1${rootOf(room)}/invitations/batch`;
      await page.getByRole('button', { name: 'Invitar estudiantes', exact: true }).click();
      const batch = page.getByRole('dialog', { name: 'Invitar alumnos', exact: true });
      await batch.getByLabel('Correos electrónicos', { exact: true }).fill(recipient);
      try {
        evidence.pausedAt = new Date().toISOString(); evidence.mailPaused = await runtime.pauseMail(); await flush();
        assertMailpitContinuity(evidence.mailBefore, evidence.mailPaused); assert.equal(evidence.mailPaused.paused, true);
        const response = await observedUiAction(page, () => batch.getByRole('button', { name: 'Invitar a 1 persona', exact: true }).click(), r => {
          const path = new URL(r.url()).pathname;
          return r.request().method() === 'POST' && path.startsWith(`${batchPath}/`) && path.endsWith('/0');
        });
        assert.equal(response.status(), 200);
        const receipt = await response.json();
        assert.equal(receipt.status, 'created'); assert.equal(receipt.email, recipient);
        await batch.getByRole('listitem').filter({ hasText: recipient }).getByText('Invitación en cola', { exact: true }).waitFor();
        await batch.getByRole('button', { name: 'Cerrar', exact: true }).click();
        invitation = (await ok(page, 'GET', `${rootOf(room)}/invitations`)).find(row => row.id === receipt.invitationId);
        assert.ok(invitation?.generation, 'The queued invitation must exist with a generation in the real public listing');
        evidence.invitation = { id: invitation.id, generation: invitation.generation, delivery: 'queued' };
        const failure = await awaitJob('failedPending', row => row.status === 'PENDING' && row.attempt_count >= 1 && row.last_error_code === 'P5_MAIL_UNAVAILABLE', 30000);
        assert.equal(failure.invitation_id, invitation.id); assert.equal(failure.generation, invitation.generation);
        assert.ok(new Date(failure.available_at) - new Date(failure.updated_at) >= 59000);
        evidence.academicAfterFailure = await academicHash(runtime.db);
        const pendingInvitation = await reenter('failedDeliveryReentry');
        assert.equal(pendingInvitation.deliveryStatus, 'PENDING');
        assert.equal(pendingInvitation.deliveryError, 'P5_MAIL_UNAVAILABLE');
        const item = page.getByRole('listitem').filter({ hasText: recipient });
        await item.getByText('No se pudo enviar el correo. Podés reenviar la invitación.', { exact: true }).waitFor();
        assert.equal(await item.getByText('Correo aceptado para envío.', { exact: true }).count(), 0);
        await page.screenshot({ path: join(scratch, 'mail-pending-error.png'), fullPage: true }); await flush();
      } finally {
        evidence.mailResumed = await runtime.resumeMail(); evidence.resumedAt = new Date().toISOString(); await flush();
      }
      assertMailpitContinuity(evidence.mailBefore, evidence.mailResumed); assert.equal(evidence.mailResumed.paused, false);
      const completed = await awaitJob('naturalCompletion', row => row.status === 'COMPLETED' && row.last_error_code === null, 95000);
      const failed = evidence.observations.find(row => row.label === 'failedPending' && row.row?.last_error_code === 'P5_MAIL_UNAVAILABLE').row;
      assert.ok(completed.attempt_count > failed.attempt_count);
      assert.ok(new Date(completed.completed_at) >= new Date(failed.available_at), 'No artificial clock shift or immediate dispatch');
      assert.equal(await academicHash(runtime.db), evidence.academicAfterFailure, 'Delivery retry must not mutate academic/membership data');
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM membership_periods')).rows[0].n, membersBefore);
      const link = await capturedInvitation(runtime.inbox, recipient, invitation.id);
      assert.equal(new URL(link).searchParams.get('invitacion'), invitation.id);
      evidence.captured = { recipient, invitationId: invitation.id, at: new Date().toISOString(), linkMatches: true };
      const acceptedInvitation = await reenter('completedDeliveryReentry');
      assert.equal(acceptedInvitation.deliveryStatus, 'COMPLETED'); assert.equal(acceptedInvitation.deliveryError, null);
      await page.getByRole('listitem').filter({ hasText: recipient }).getByText('Correo aceptado para envío.', { exact: true }).waitFor();
      evidence.mailAfter = await runtime.inspectMail(); evidence.bindingsAfter = await runtime.inspectMailBindings();
      assertMailpitContinuity(evidence.mailBefore, evidence.mailAfter);
      assert.deepEqual(evidence.bindingsAfter, evidence.bindingsBefore);
      assert.deepEqual(runtime.inspectServices(), evidence.servicesBefore);
      evidence.outcome = 'FIRST_SMTP_NATURAL_RETRY_VERIFIED'; await flush();
    } catch (error) {
      evidence.failure = { name: error.name, code: error.code ?? 'MAIL_RECOVERY_ASSERTION_FAILED' }; await flush(); throw error;
    } finally { await runtime.resumeMail(); evidence.finalMail = await runtime.inspectMail(); await flush(); }
  });
});
