import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openClassroom, planPdf, upload } from './p6-integration-helpers.mjs';
import { digest } from './p4-integration-helpers.mjs';
import {seedPlan} from './helpers/plan-fixture.mjs';
import { observedUiAction } from './p8-current-ui-helpers.mjs';
import { withJourney, ok, request, detail, rootOf, createActivity, changeActivity,
  rejectUnchanged, academicHash, selectClassroomSection } from './p9-journey-helpers-current.mjs';

// Only an observed429 permits one bounded wait and another action on the existing visible control.
async function confirmed(page, path, method, action) {
  const wait = () => page.waitForResponse(response => {
    const actual = new URL(response.url()).pathname;
    return (actual === `/api/v1${path}` && response.request().method() === method)
      || (actual === '/api/v1/auth/csrf' && response.status() === 429);
  });
  let [response] = await Promise.all([wait(), action()]);
  if (response.status() === 429) {
    const seconds = Number(response.headers()['retry-after']);
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    await response.finished(); console.log(`P9 remaining teaching honors actual Retry-After=${seconds}s once through visible control`);
    await delay(seconds * 1000);
    [response] = await Promise.all([wait(), action()]);
  }
  assert.equal(response.status(), 200, `Actual ${method} ${path}`);
  return response.json();
}
async function readProgress(page, path, action) {
  const matches = response => new URL(response.url()).pathname === `/api/v1${path}` && response.request().method() === 'GET';
  let response = await observedUiAction(page, action, matches);
  if (response.status() === 429) {
    assert.equal((await response.json()).error?.code, 'RATE_LIMITED');
    const raw = response.headers()['retry-after']; assert.match(raw ?? '', /^\d+$/);
    const seconds = Number(raw); assert.ok(Number.isInteger(seconds) && seconds >= 1 && seconds <= 60);
    await response.finished();
    const progress = page.getByRole('region', { name: 'Seguimiento del aprendizaje', exact: true });
    const error = progress.getByRole('alert');
    const retry = error.getByRole('button', { name: 'Reintentar progreso', exact: true });
    await error.waitFor();
    await retry.waitFor();
    console.log(`P9 progress honors actual Retry-After=${seconds}s once through Reintentar progreso`);
    await delay(seconds * 1000);
    response = await observedUiAction(page, () => retry.click(), matches);
  }
  assert.equal(response.status(), 200, `Actual GET ${path}`);
  return response.json();
}
async function unique(locator) {
  await locator.waitFor({ state: 'visible' });
  assert.equal(await locator.count(), 1, 'Exactly one scoped control is required'); return locator;
}

test('P9 remaining teaching only: TAUGHT, immutable Library, Muro moderation/scoped news, progress and durable private bytes', { timeout: 330000 }, async () => {
  await withJourney('teaching-remainder', async world => {
    const { runtime, T, S, room, scratch } = world, teacher = T.page, student = S.page, root = rootOf(room);
    // Preserve real two-version/current-NEXT context as setup, not accepted version/digest/NEXT assertion bodies.
    const nextPlan = await upload(teacher, { kind: 'classroom', id: room.id }, await planPdf('Remaining teaching setup plan'));
    await seedPlan(runtime.db.query.bind(runtime.db),room.id,{action:'appendVersion',fileId:nextPlan.id});
    const initial = await detail(teacher, room), unit = initial.units[0], topic = unit.topics[0];
    await ok(teacher, 'POST', `${root}/plan`, { revision: initial.revision,
      operation: { action: 'setTopicState', id: topic.id, status: 'NEXT' } });
    await openClassroom(teacher, runtime.origin, 'P9 teaching-remainder classroom');
    await selectClassroomSection(teacher, 'plan', 'Plan');
    const plan = teacher.getByRole('region', { name: 'Plan de estudio', exact: true });
    const selectedTopic = plan.getByRole('region', { name: 'Tema seleccionado', exact: true });
    await selectedTopic.getByRole('heading', { name: topic.name, exact: true }).waitFor();
    const state = await unique(selectedTopic.getByRole('button', { name: 'Marcar como dado', pressed: false, exact: true }));
    await confirmed(teacher, `${root}/plan`, 'POST', () => state.click());
    await plan.getByText('Tema marcado como dado.', { exact: true }).waitFor();
    await selectedTopic.getByRole('button', { name: 'Marcar como pendiente', pressed: true, exact: true }).waitFor();
    const taught = await detail(teacher, room);
    assert.equal(taught.units[0].topics[0].id, topic.id); assert.equal(taught.units[0].topics[0].status, 'TAUGHT');
    assert.equal(taught.units.flatMap(row => row.topics).filter(row => row.status === 'NEXT').length, 0);
    await rejectUnchanged(runtime.db, () => request(student, 'POST', `${root}/plan`, {
      revision: taught.revision, operation: { action: 'setTopicState', id: topic.id, status: 'PENDING' } }), 403);
    console.log('P9 remaining teaching checkpoint: native TAUGHT/no automatic next/student403 academic hash unchanged');

    await selectClassroomSection(teacher, 'library', 'Biblioteca');
    const library = teacher.getByRole('region', { name: 'Biblioteca del aula', exact: true });
    const bytes = await planPdf('P9 remaining immutable material'), expectedDigest = digest(bytes);
    await library.getByRole('button', { name: 'Subir archivo', exact: true }).click();
    const materialForm = teacher.getByRole('dialog', { name: 'Subir archivo', exact: true });
    await (await unique(materialForm.getByLabel('Archivo del material', { exact: true }))).setInputFiles({
      name: 'remaining-material.pdf', mimeType: 'application/pdf', buffer: bytes });
    await materialForm.getByRole('status').filter({ hasText: 'remaining-material.pdf' }).getByText('Archivo aprobado. Ya podés publicarlo.', { exact: true }).waitFor();
    await (await unique(materialForm.getByLabel('Nombre del material', { exact: true }))).fill('Remaining linked material');
    await materialForm.getByRole('button', { name: 'Preparar y continuar', exact: true }).click();
    await materialForm.getByRole('region', { name: 'Organizar material', exact: true }).waitFor();
    assert.equal((await ok(student, 'GET', `${root}/library`)).some(item => item.title === 'Remaining linked material'), false);
    await (await unique(materialForm.getByLabel('Unidad del material', { exact: true }))).selectOption(unit.id);
    await (await unique(materialForm.getByLabel('Tema del material', { exact: true }))).selectOption(topic.id);
    await confirmed(teacher, `${root}/library`, 'POST', () => materialForm.getByRole('button', { name: 'Publicar material', exact: true }).click());
    await library.getByText('Material publicado.', { exact: true }).waitFor();
    const [material] = await ok(student, 'GET', `${root}/library`);
    assert.equal(material.unitId, unit.id); assert.equal(material.topicId, topic.id); assert.equal(material.ready, true);
    const linked = await createActivity(world, 'ASSIGNMENT', { publish: false, title: 'Remaining material association' });
    await changeActivity(teacher, room, { action: 'save', id: linked.id, payload: { ...linked.payload, materialIds: [material.id] } });
    await changeActivity(teacher, room, { action: 'publish', id: linked.id });
    const libraryChange = async operation => request(teacher, 'POST', `${root}/library`, { revision: (await detail(teacher, room)).revision, operation });
    await rejectUnchanged(runtime.db, () => libraryChange({ action: 'delete', id: material.id, confirm: true }), 409);
    await rejectUnchanged(runtime.db, () => request(teacher, 'PUT', `/files/${material.fileId}/content`,
      { base64: bytes.toString('base64') }), 403);
    await rejectUnchanged(runtime.db, async () => request(student, 'POST', `${root}/library`, {
      revision: (await detail(teacher, room)).revision, operation: { action: 'delete', id: material.id, confirm: true } }), 403);
    await openClassroom(teacher, runtime.origin, 'P9 teaching-remainder classroom');
    await selectClassroomSection(teacher, 'library', 'Biblioteca');
    const materialCard = library.getByRole('article', { name: material.title, exact: true });
    await materialCard.getByRole('button', { name: `Abrir material: ${material.title}`, exact: true }).click();
    const teacherReader = teacher.getByRole('region', { name: `Lectura de ${material.title}`, exact: true });
    await teacherReader.getByText(`${unit.name} · ${topic.name}`, { exact: true }).waitFor();
    await teacherReader.getByRole('button', { name: 'Cerrar', exact: true }).click();
    // The reader is read-only in the approved UI. The authenticated metadata contract remains available.
    const edit = { action: 'edit', id: material.id, title: 'Reorganized same private material',
      unitId: null, topicId: null, contentKind: material.contentKind };
    await rejectUnchanged(runtime.db, async () => request(student, 'POST', `${root}/library`, {
      revision: (await detail(teacher, room)).revision, operation: edit }), 403);
    assert.equal((await libraryChange(edit)).status, 200);
    const [reorganized] = await ok(student, 'GET', `${root}/library`);
    assert.equal(reorganized.id, material.id); assert.equal(reorganized.fileId, material.fileId);
    assert.equal(reorganized.unitId, null); assert.equal(reorganized.topicId, null); assert.equal(reorganized.linked, true);
    await openClassroom(student, runtime.origin, 'P9 teaching-remainder classroom');
    await selectClassroomSection(student, 'plan', 'Plan');
    await student.getByRole('region', { name: 'Plan de estudio', exact: true }).getByRole('heading', { name: 'Plan de estudio', exact: true }).waitFor();
    const studentPlan = student.getByRole('region', { name: 'Plan de estudio', exact: true });
    await studentPlan.getByRole('region', { name: 'Tema seleccionado', exact: true }).waitFor();
    assert.equal(await studentPlan.getByRole('button', { name: /^Marcar como (dado|pendiente)$/ }).count(), 0);
    assert.equal(await studentPlan.getByText('Administrar plan', { exact: false }).count(), 0);
    assert.equal(await studentPlan.getByLabel('Archivo del plan (PDF o DOCX)', { exact: true }).count(), 0);
    await confirmed(student, `${root}/library`, 'GET', () => selectClassroomSection(student, 'library', 'Biblioteca'));
    const studentLibrary = student.getByRole('region', { name: 'Biblioteca del aula', exact: true });
    const card = studentLibrary.getByRole('article', { name: reorganized.title, exact: true }); await card.waitFor();
    assert.equal(await studentLibrary.getByLabel('Archivo del material', { exact: true }).count(), 0);
    assert.equal(await studentLibrary.getByRole('button', { name: 'Subir archivo', exact: true }).count(), 0);
    await card.getByRole('button', { name: `Abrir material: ${reorganized.title}`, exact: true }).click();
    const studentReader = student.getByRole('region', { name: `Lectura de ${reorganized.title}`, exact: true });
    await studentReader.getByText('Sin unidad ni tema', { exact: true }).waitFor();
    assert.equal(await studentReader.getByRole('button', { name: 'Editar datos', exact: true }).count(), 0);
    await studentReader.getByRole('button', { name: 'Cerrar', exact: true }).click();
    const preview = await request(student, 'GET', `/files/${material.fileId}/content?mode=preview`);
    assert.equal(preview.status, 200); assert.equal(preview.digest, expectedDigest);
    assert.equal((await request(student, 'GET', `/files/${material.fileId}/content`)).digest, expectedDigest);
    console.log(`P9 remaining teaching checkpoint: Library identity=${material.id} privateSHA256=${expectedDigest} publication/association/immutable403/linked409/read-only PASS`);

    await confirmed(teacher, `${root}/wall`, 'GET', () => selectClassroomSection(teacher, 'wall', 'Muro'));
    const teacherWall = teacher.getByRole('region', { name: 'Muro del aula', exact: true });
    await teacherWall.getByRole('button', { name: 'Publicar aviso', exact: true }).click();
    const noticeComposer = teacher.getByRole('dialog', { name: 'Una idea para tu grupo', exact: true });
    await noticeComposer.getByLabel('Título', { exact: true }).fill('Remaining teacher notice');
    await noticeComposer.getByLabel('Tu mensaje', { exact: true }).fill('Remaining teacher notice');
    await confirmed(teacher, `${root}/wall`, 'POST', () => noticeComposer.getByRole('button', { name: 'Publicar mensaje', exact: true }).click());
    await teacherWall.getByText('Aviso publicado en el aula.', { exact: true }).waitFor();
    const notice = (await ok(student, 'GET', `${root}/wall`)).posts[0];
    assert.equal(notice.type, 'NOTICE'); assert.ok(notice.authorName && notice.initials); assert.equal(Object.hasOwn(notice, 'email'), false);
    await confirmed(student, `${root}/wall`, 'GET', () => selectClassroomSection(student, 'wall', 'Muro'));
    const studentWall = student.getByRole('region', { name: 'Muro del aula', exact: true });
    const noticeThread = studentWall.locator(`[data-wall-id="${notice.id}"]`);
    await noticeThread.getByRole('button', { name: 'Responder publicación', exact: true }).click();
    const replyComposer = student.getByRole('dialog', { name: 'Continuar la conversación', exact: true });
    await replyComposer.getByLabel('Tu respuesta', { exact: true }).fill('Remaining student reply');
    await confirmed(student, `${root}/wall`, 'POST', () => replyComposer.getByRole('button', { name: 'Publicar mensaje', exact: true }).click());
    await studentWall.getByText('Respuesta publicada.', { exact: true }).waitFor();
    await studentWall.getByRole('button', { name: 'Hacer una consulta', exact: true }).click();
    const queryComposer = student.getByRole('dialog', { name: 'Tu pregunta tiene lugar', exact: true });
    await queryComposer.getByLabel('Título', { exact: true }).fill('Remaining student query');
    await queryComposer.getByLabel('Tu mensaje', { exact: true }).fill('Remaining student query');
    await confirmed(student, `${root}/wall`, 'POST', () => queryComposer.getByRole('button', { name: 'Publicar mensaje', exact: true }).click());
    await studentWall.getByText('Consulta publicada en el aula.', { exact: true }).waitFor();
    const currentWall = await ok(teacher, 'GET', `${root}/wall`), query = currentWall.posts[0];
    assert.equal(query.type, 'QUERY'); assert.deepEqual(currentWall.posts.map(post => post.id), [query.id, notice.id]);
    assert.equal(currentWall.posts[1].replies[0].body, 'Remaining student reply');
    const wallChange = async (actor, operation) => request(actor, 'POST', `${root}/wall`, {
      revision: (await ok(actor, 'GET', `${root}/wall`)).revision, operation });
    await rejectUnchanged(runtime.db, () => wallChange(teacher, { action: 'editPost', id: query.id, body: 'Forbidden teacher rewrite' }), 403);
    await rejectUnchanged(runtime.db, () => wallChange(student, { action: 'editPost', id: notice.id, body: 'Forbidden student rewrite' }), 403);
    assert.equal((await wallChange(teacher, { action: 'reply', postId: query.id, body: 'Preserved teacher reply to student query' })).status, 200);

    const teacherEvents = await ok(teacher, 'GET', '/classrooms/notifications');
    const queryEvent = teacherEvents.find(event => event.eventType === 'WALL_QUERY' && event.postId === query.id);
    assert.equal(queryEvent.actorName,'Files Fixture');assert.equal(queryEvent.message,'Remaining student query');assert.equal(queryEvent.classroomDivision,(await detail(teacher,room)).division);
    assert.ok(queryEvent); assert.ok(teacherEvents.some(event => event.eventType === 'WALL_REPLY' && event.postId === notice.id));
    await rejectUnchanged(runtime.db, () => request(student, 'POST', `/classrooms/notifications/${queryEvent.id}/read`, {}), 403);
    await teacher.goto(`${runtime.origin}/notificaciones`);
    const notificationDialog = teacher.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true });
    const queryTitle = `Consulta de ${queryEvent.actorName}`;
    const queryRow = await unique(notificationDialog.locator(`article[data-notice-id="${queryEvent.id}"]`));
    await queryRow.getByRole('heading', { name: queryTitle, exact: true }).waitFor();
    await confirmed(teacher, `/classrooms/notifications/${queryEvent.id}/read`, 'POST', () => queryRow.getByRole('button', { name: `Marcar como leída: ${queryTitle}`, exact: true }).click());
    await queryRow.getByRole('button', { name: `Marcar como no leída: ${queryTitle}`, exact: true }).waitFor();
    assert.ok((await ok(teacher, 'GET', '/classrooms/notifications')).find(event => event.id === queryEvent.id).readAt);
    const noticeEvent = (await ok(student, 'GET', '/classrooms/notifications')).find(event => event.eventType === 'WALL_NOTICE' && event.postId === notice.id);
    assert.ok(noticeEvent);
    await student.goto(`${runtime.origin}/notificaciones`);
    const studentNotifications = student.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true });
    const noticeRow = await unique(studentNotifications.locator(`article[data-notice-id="${noticeEvent.id}"]`));
    await noticeRow.getByRole('heading', { name: 'Nuevo aviso del docente', exact: true }).waitFor();
    const target = await confirmed(student, `/classrooms/notifications/${noticeEvent.id}/open`, 'POST', () => noticeRow.getByRole('button', { name: 'Ir al muro', exact: true }).click());
    assert.equal(target.classroomId, room.id); assert.equal(target.postId, notice.id);
    await student.waitForFunction(id => document.activeElement?.dataset.wallId === id, notice.id);
    assert.ok((await ok(student, 'GET', '/classrooms/notifications')).find(event => event.id === noticeEvent.id).readAt);

    await openClassroom(teacher, runtime.origin, 'P9 teaching-remainder classroom');
    await selectClassroomSection(teacher, 'wall', 'Muro');
    const queryThread = teacherWall.locator(`[data-wall-id="${query.id}"]`); await queryThread.waitFor();
    assert.equal(await queryThread.getByRole('button', { name: 'Editar publicación', exact: true }).count(), 0);
    const cancelHash = await academicHash(runtime.db);
    await queryThread.getByRole('button', { name: 'Eliminar publicación', exact: true }).click();
    await teacher.getByRole('dialog', { name: 'Eliminar publicación', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await academicHash(runtime.db), cancelHash);
    await queryThread.getByRole('button', { name: 'Eliminar publicación', exact: true }).click();
    await confirmed(teacher, `${root}/wall`, 'POST', () => teacher.getByRole('dialog', { name: 'Eliminar publicación', exact: true })
      .getByRole('button', { name: 'Confirmar eliminación', exact: true }).click());
    await queryThread.getByText('Contenido eliminado', { exact: true }).waitFor();
    const removed = (await ok(student, 'GET', `${root}/wall`)).posts.find(post => post.id === query.id);
    assert.equal(removed.body, null); assert.ok(removed.removedAt);
    assert.equal((await ok(teacher,'GET','/classrooms/notifications')).find(event=>event.id===queryEvent.id).message,null,'Notification previews cannot resurrect removed post text');
    assert.deepEqual(removed.replies.map(reply => reply.body), ['Preserved teacher reply to student query']);
    console.log('P9 remaining teaching checkpoint: notice/query/reply/recipient403/read/open/moderationcancel/tombstone-preserved-reply PASS');

    const progress = await readProgress(student, `${root}/progress`, () => student.getByRole('navigation', { name: 'Secciones del aula', exact: true }).getByRole('button', { name: 'Mi progreso', exact: true }).click());
    const { units: progressUnits, ...planTotals } = progress.plan;
    assert.deepEqual(planTotals, { total: 2, taught: 1, percentage: '50.00' });
    assert.deepEqual(progressUnits?.map(({ id, name, total, taught }) => ({ id, name, total, taught })),
      [{ id: unit.id, name: unit.name, total: 2, taught: 1 }]);
    assert.equal(progress.completion.expected, 1); assert.equal(progress.completion.delivered, 0); assert.equal(progress.completion.percentage, '0.00');
    assert.equal(progress.performance.average, null);
    const progressRegion = student.getByRole('region', { name: 'Seguimiento del aprendizaje', exact: true });
    const planProgress = progressRegion.getByRole('region', { name: 'Avance del plan', exact: true });
    await planProgress.getByRole('heading', { name: unit.name, exact: true }).waitFor();
    await planProgress.getByText('1 de 2 temas', { exact: true }).waitFor();
    await progressRegion.getByText('Todavía no hay notas publicadas', { exact: true }).waitFor();
    assert.equal(await progressRegion.getByRole('alert').count(), 0);
    const retained = { wall: await ok(teacher, 'GET', `${root}/wall`), material: await ok(student, 'GET', `${root}/library`),
      teacherEvents: await ok(teacher, 'GET', '/classrooms/notifications'), studentEvents: await ok(student, 'GET', '/classrooms/notifications') };
    await student.screenshot({ path: join(scratch, 'remaining-teaching-progress.png'), fullPage: true });
    const beforeRestart = await academicHash(runtime.db); await runtime.restartData(); assert.equal(await academicHash(runtime.db), beforeRestart);
    assert.deepEqual(await ok(teacher, 'GET', `${root}/wall`), retained.wall);
    assert.deepEqual(await ok(student, 'GET', `${root}/library`), retained.material);
    assert.deepEqual(await ok(teacher, 'GET', '/classrooms/notifications'), retained.teacherEvents);
    assert.deepEqual(await ok(student, 'GET', '/classrooms/notifications'), retained.studentEvents);
    assert.deepEqual(await ok(student, 'GET', `${root}/progress`), progress);
    const restoredBytes = await request(student, 'GET', `/files/${material.fileId}/content`);
    assert.equal(restoredBytes.status, 200); assert.equal(restoredBytes.digest, expectedDigest);
    assert.equal(digest(await runtime.privateFileBytes(material.fileId)), expectedDigest);
    await teacher.reload();
    await teacher.getByRole('heading', { name: 'P9 teaching-remainder classroom', exact: true }).waitFor();
    await student.reload();
    await student.getByRole('heading', { name: 'P9 teaching-remainder classroom', exact: true }).waitFor();
    console.log('P9 remaining teaching: progress/Plan-Library-Muro/notification-read/privateSHA256/API-data-restart PASS');
  });
});
