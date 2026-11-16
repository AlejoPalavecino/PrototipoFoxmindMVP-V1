import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Browser, sleep } from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';

const html = path.resolve('design/foxmind-ui-lab/01-foxmind.html');
const output = path.resolve('.test-artifacts/ui-lab/final-audit/independent', process.argv[3] || '.');
const report = {
  candidate: createHash('sha256').update(await readFile(html)).digest('hex'),
  runs: [],
};
await mkdir(output, { recursive: true });
const browser = await Browser.launch({ extraArgs: ['--disable-background-networking'] });
const query = process.argv[2] === 'all' ? '' : process.argv[2];
let page;
let run;
let count = 0;

const action = (name, extra = '') => '[data-action="' + name + '"]' + extra;
const id = value => '[data-id="' + value + '"]';
const result = (name, expected, observed, pass) => run.results.push({ name, expected, observed, pass });
const debug = async () => page.eval(() => ({
  url: location.hash,
  h1: document.querySelector('#main h1')?.textContent,
  dialog: document.querySelector('dialog[open] h2')?.textContent,
  toast: document.querySelector('#toast.show')?.textContent,
  active: document.activeElement?.outerHTML.slice(0, 140),
  width: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
}));
async function waitFor(selector, wait = 4500) {
  const end = Date.now() + wait;
  while (Date.now() < end) {
    if (await page.eval(s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length && !e.disabled), selector)) return;
    await sleep(65);
  }
  throw new Error('Control ausente: ' + selector + ' ' + JSON.stringify(await debug()));
}
async function click(selector) {
  await waitFor(selector);
  const target = await page.eval(s => {
    const el = [...document.querySelectorAll(s)].find(e => e.getClientRects().length && !e.disabled);
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const x = Math.min(innerWidth - 1, Math.max(1, (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2));
    const y = Math.min(innerHeight - 1, Math.max(1, (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2));
    const hit = document.elementFromPoint(x, y);
    return { x, y, ok: el.contains(hit), hit: hit?.outerHTML.slice(0, 150), rect: r.toJSON() };
  }, selector);
  if (!target.ok) throw new Error('Control cubierto: ' + selector + ' ' + JSON.stringify(target));
  if (page.viewport.mobile) {
    await page.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: target.x, y: target.y}]});
    await page.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  } else {
    const { x, y } = target;
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await sleep(110);
}
const act = (name, extra) => click(action(name, extra));
const changeRole = role => click('[data-role="' + role + '"]');
async function fill(selector, value) {
  await waitFor(selector);
  await page.eval(({ selector, value }) => {
    const el = document.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
}
async function nav(role, section) {
  if (page.viewport.mobile) await act('menu');
  await click('.sidebar a[href="#' + role + '/' + section + '"]');
}
const room = section => click('.room-section-nav a[href$="/' + section + '"],.room-section-nav a[href*="/' + section + '?"]');
const board = classId => click('#class-results [data-class="' + classId + '"]');
async function capture(name) {
  const file = run.name + '-' + page.viewport.width + '-' + name + '.png';
  await page.screenshot({ path: path.join(output, file), format: 'png' });
  run.captures.push({ file, ...(await debug()) });
}
const read = () => page.eval(() => JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')));
const mainHas = str => page.eval(s => document.querySelector('#main')?.textContent.includes(s), str);
const attemptStorageFailure = () => page.eval(() => {
  const writes = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    Storage.prototype.setItem = writes;
    throw new DOMException('Injected synthetic write failure', 'QuotaExceededError');
  };
});
async function checkCase(name, width, start, fn) {
  if (query && !name.includes(query)) return;
  page = await browser.newPage({ width, height: width < 700 ? 844 : 900, mobile: width < 700, reducedMotion: true });
  run = { name, width, results: [], captures: [], errors: [] };
  report.runs.push(run);
  try {
    await page.send('Network.enable');
    await page.send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
    await page.goto(pathToFileURL(html).href + '?xref=' + ++count + '#' + start, { settleMs: 150 });
    await page.eval(() => localStorage.removeItem('foxmind-ui-lab-v1'));
    await page.goto(pathToFileURL(html).href + '?xref=' + ++count + '#' + start, { settleMs: 180 });
    await fn();
  } catch (error) {
    run.errors.push(error.message);
    await capture('stopped').catch(() => {});
  } finally {
    run.errors.push(...page.consoleErrors);
    await page.close();
  }
}

const mockedClassTitle = 'Taller sin integrantes';
async function createEmptyClass({ failure = false } = {}) {
  await act('new-class');
  await fill('[data-wizard="name"]', mockedClassTitle);
  await fill('[data-wizard="subject"]', 'Auditoría sintética');
  await fill('[data-wizard="group"]', '3.º Z');
  await act('wizard-next');
  await capture('program');
  await act('class-upload');
  await waitFor('[name="class-method"][value="manual"]');
  await click('[name="class-method"][value="manual"]');
  await act('wizard-next');
  await fill('#class-unit-0', 'Observación');
  await fill('#class-topic-0-0', 'Experimento de luz');
  if (failure) {
    const before = (await read())?.drafts?.length || 0;
    await attemptStorageFailure();
    await act('wizard-save');
    const afterError = await debug();
    result('Guardar borrador fallido informa error y mantiene editor', 'Editor abierto y mensaje de error', afterError,
      afterError.dialog === 'Crear un aula' && afterError.toast.includes('No pudimos guardar'));
    await act('close');
    await nav('docente', 'avisos');
    await act('nt-toggle', id('delivery-r1'));
    const afterOtherWrite = (await read()).drafts.length;
    result('Otro guardado no confirma borrador que falló', before, afterOtherWrite, afterOtherWrite === before);
    await nav('docente', 'aulas');
    await capture('failed-draft-saved');
    return;
  }
  await act('wizard-save');
  await act('resume-wizard');
  const resume = await page.eval(() => ({
    step: document.querySelector('.class-step-heading span').textContent,
    unit: document.querySelector('#class-unit-0').value,
    topic: document.querySelector('#class-topic-0-0').value,
  }));
  result('Borrador docente vuelve al paso guardado', 'Paso 3, con unidad y tema', resume,
    resume.step.includes('3 de 4') && resume.unit === 'Observación' && resume.topic === 'Experimento de luz');
  await act('wizard-next');
  await capture('fourth-step');
  await act('wizard-create');
  const c = (await read()).classes.find(c => c.name === mockedClassTitle);
  result('Creación guarda aula sin alumnos y elimina borrador', 'Roster vacío, sin borradores', { roster: c?.roster, drafts: (await read()).drafts.length },
    c?.roster.length === 0 && !(await read()).drafts.length);
  return c;
}

await checkCase('wall-and-history', 1440, 'docente/aulas', async () => {
  const title = 'Aviso sintético exclusivo de Foto';
  await board('photo');
  await room('muro');
  await act('new-post');
  await fill('#post-form [name=title]', title);
  await fill('#post-body', 'Solamente para el grupo de Fotografía y luz.');
  await click('button[form="post-form"]');
  result('Publicación aparece en muro de origen', true, await mainHas(title), await mainHas(title));
  await capture('photo-wall');
  await click('.sidebar-classes [data-class="bio"]');
  await page.eval(() => history.back());
  await sleep(210);
  const back = await debug();
  result('Atrás vuelve al mismo muro y aula', 'Fotografía y luz · Muro', back, back.h1 === 'Fotografía y luz');
  await capture('back-wall');
  await click('.sidebar-classes [data-class="bio"]');
  await room('muro');
  const other = await mainHas(title);
  result('Aviso de Foto excluido del muro de Biología', false, other, !other);
  await changeRole('estudiante');
  await nav('estudiante', 'aulas');
  await board('bio');
  await room('muro');
  result('El estudiante de Biología no ve el aviso de Foto en ese muro', false, await mainHas(title), !await mainHas(title));
  await capture('student-bio-wall');
});

await checkCase('classroom-mismatch', 390, 'docente/aulas', async () => {
  const c = await createEmptyClass();
  await board(c.id);
  await room('plan');
  result('Plan mantiene tema del aula creada', true, await mainHas('Experimento de luz'), await mainHas('Experimento de luz'));
  await changeRole('estudiante');
  await nav('estudiante', 'aulas');
  const visible = await mainHas(mockedClassTitle);
  result('Mis aulas estudiante excluye aula sin inscripción', false, visible, !visible);
  if (visible) {
    await capture('student-collection');
    await board(c.id);
    await capture('student-unenrolled-class');
  } else {
    await page.eval(classId => { location.hash = '#estudiante/aula/plan?class=' + encodeURIComponent(classId); }, c.id);
    await sleep(200);
  }
  const asStudent = await debug();
  result('Sin inscripción no abre plan', 'Acceso ausente', asStudent,
    asStudent.h1 !== mockedClassTitle && !await mainHas('Experimento de luz'));
});

await checkCase('storage-rollback', 1440, 'docente/aulas', async () => {
  await createEmptyClass({ failure: true });
});

await checkCase('agenda-from-notice', 390, 'docente/avisos', async () => {
  const title = 'Agenda sintética editada desde avisos';
  await act('nt-open', id('event-2'));
  await act('edit-event');
  await fill('#f-title', title);
  await fill('#f-end', '15:00');
  await click('button[form="event-form"]');
  result('Edición inválida enfocada', '#f-end', await page.eval(() => document.activeElement.id), await page.eval(() => document.activeElement.id === 'f-end'));
  await fill('#f-end', '16:45');
  await click('button[form="event-form"]');
  result('Aviso refleja edición', true, await mainHas(title), await mainHas(title));
  await nav('docente', 'agenda');
  const view = await page.eval(() => [...document.querySelectorAll('[data-action="event-detail"]')].find(e => e.textContent.includes('Agenda sintética editada'))?.textContent.trim());
  result('Agenda refleja edición de avisos', true, Boolean(view), Boolean(view));
  await capture('agenda-edited');
});

await checkCase('authorship-handoff', 390, 'docente/aula/actividades', async () => {
  const title = 'Comparar dos temas en la práctica';
  const privateBrief = 'Compará dos ejemplos con una diferencia. Marcador privado ZX813.';
  const feedback = 'Relacionaste los temas con una observación concreta.';
  await act('new-activity');
  await click('[data-compose=topic][value="photo-u0-t0"]');
  await click('[data-compose=topic][value="photo-u1-t0"]');
  await click('[data-compose=type][value="Cuestionario"]');
  await click('[data-compose=method][value="ai"]');
  await act('compose-next');
  const briefError = await page.eval(() => ({focus: document.activeElement.id, message: document.querySelector('#compose-ai-brief-error')?.textContent}));
  result('Generar sin idea rechaza y enfoca', '#compose-ai-brief', briefError, briefError.focus === 'compose-ai-brief' && Boolean(briefError.message));
  await fill('#compose-ai-brief', privateBrief);
  await act('compose-next');
  await waitFor('#compose-title');
  await fill('#compose-title', title);
  await fill('#compose-date', '2026-11-19');
  await fill('#compose-time', '18:30');
  await act('compose-save');
  const storedDraft = (await read()).activityDrafts[0];
  await changeRole('estudiante');
  result('Inicio estudiante no muestra título privado', false, await mainHas(title), !await mainHas(title));
  await nav('estudiante', 'avisos');
  result('Avisos estudiante no muestran título privado', false, await mainHas(title), !await mainHas(title));
  await changeRole('docente');
  await nav('docente', 'aulas');
  await board('photo');
  await room('actividades');
  await act('learning-collection', '[data-value=drafts]');
  await act('resume-activity-draft', id(storedDraft.id));
  await act('compose-next');
  await act('compose-publish');
  result('Vista previa docente previa a publicación conserva grupo y borrador', 'Confirmación abierta y actividad ausente', await debug(), !(await read()).activities.some(a => a.title === title));
  await act('compose-confirm-publish');
  const assigned = (await read()).activities.find(a => a.title === title);
  result('Actividad publicada mantiene alcance y elimina la idea privada', '2 unidades y texto privado ausente', {
    count: new Set(assigned?.spec.topics.map(t => t.unitId)).size,
    briefInPublishedData: JSON.stringify(assigned).includes('ZX813'),
  }, new Set(assigned?.spec.topics.map(t => t.unitId)).size === 2 && !JSON.stringify(assigned).includes('ZX813'));
  await changeRole('estudiante');
  await nav('estudiante', 'avisos');
  await act('nt-open', id('activity-' + assigned.id));
  result('Publicación abre su ficha correcta desde nuevo aviso', title, await debug(), await mainHas(title));
  await capture('student-activity');
  await act('learning-start');
  await fill('[data-response="0"]', 'Comparo la iluminación de una ventana con la de una lámpara.');
  await act('question', id(assigned.spec.questions.length - 1));
  await act('review-submission');
  const incomplete = await page.eval(() => document.querySelector('dialog[open] .notice.warning')?.textContent);
  result('Advertencia de intento incompleto tiene cantidad/cero', 'Advertencia de cero puntos', incomplete, incomplete.includes('cero puntos'));
  await act('confirm-submission');
  const receipt = (await read()).submitted[assigned.id];
  result('Recepción conserva la respuesta en el mismo trabajo', true, receipt, Boolean(receipt.answers[0]));
  await changeRole('docente');
  await nav('docente', 'avisos');
  await act('nt-open', id('delivery-review-' + assigned.id + '-marina'));
  result('La entrega llega al aviso docente, con respuesta del trabajo correcto', true, await mainHas('una ventana'), await mainHas('una ventana'));
  await fill('#grade', '0');
  await act('learning-review-tab', '[data-review-tab=feedback]');
  await fill('#feedback-strengths', feedback);
  await click('button[form="learning-grade-form"]');
  await changeRole('estudiante');
  await nav('estudiante', 'avisos');
  result('La revisión guardada en privado no crea un aviso de devolución', false, await page.eval(i => Boolean(document.querySelector('[data-notice-id="grade-' + i + '"]')), assigned.id),
    !await page.eval(i => Boolean(document.querySelector('[data-notice-id="grade-' + i + '"]')), assigned.id));
  await changeRole('docente');
  await nav('docente', 'avisos');
  await act('nt-open', id('delivery-review-' + assigned.id + '-marina'));
  await act('publish-grade');
  await attemptStorageFailure();
  await act('confirm-publish');
  const failureInfo = await page.eval(() => ({ message: document.querySelector('#learning-grade-error').textContent, toast: document.querySelector('#toast')?.dataset.tone }));
  result('Fallo de publicación conserva revisión privada', 'Error visible, sin resultado publicado', failureInfo,
    failureInfo.message.includes('No pudimos publicar') && !(await read()).activities.find(a => a.id === assigned.id).publishedFeedback);
  await act('publish-grade');
  await act('confirm-publish');
  await changeRole('estudiante');
  await nav('estudiante', 'avisos');
  await act('nt-open', id('grade-' + assigned.id));
  const grade = await page.eval(() => document.querySelector('.learning-result-grade b')?.textContent);
  result('Reintento publica nota cero y devolución al destinatario', '0 y texto de devolución', { grade, feedback: await mainHas(feedback) }, /^0\s*\/\s*10$/.test(grade?.trim() || '') && await mainHas(feedback));
  const residualToast = (await debug()).toast;
  result('La devolución estudiante no hereda mensaje de publicación docente', 'Sin confirmación docente', residualToast,
    !residualToast?.includes('Publicaste la devolución'));
  await capture('student-feedback');
});

await checkCase('study-revocation', 1440, 'estudiante/carpetas', async () => {
  await click('[data-folder="0"]');
  await act('fx-context');
  await act('fx-context-mode', '[data-value=classroom]');
  await act('fx-context-class', id('photo'));
  await act('fx-context-apply');
  await act('fx-library');
  const materialSelector = '.fx-library-file[data-origin="classroom"]';
  const initial = await page.eval(s => document.querySelectorAll(s).length, materialSelector);
  result('Vínculo de estudio resuelve Biblioteca de Fotografía', '> 0 del aula', initial, initial > 0);
  await act('fx-tray-close');
  await act('fx-attach');
  await act('fx-file-example');
  await click('button[form="fx-attach-form"]');
  await waitFor('.fx-library-file[data-origin="private"][data-status="ready"]');
  await act('fx-tray-close');
  await fill('#fx-message', 'Borrador privado entre roles.');
  await changeRole('docente');
  await nav('docente', 'aulas');
  await board('photo');
  await room('ajustes');
  await act('archive-class');
  await act('confirm-archive');
  await changeRole('estudiante');
  await nav('estudiante', 'carpetas');
  await click('[data-folder="0"]');
  const draft = await page.eval(() => document.querySelector('#fx-message').value);
  result('Borrador de chat sobrevive rol y cambio de acceso', 'Borrador privado entre roles.', draft, draft === 'Borrador privado entre roles.');
  await act('fx-library');
  const after = await page.eval(s => ({
    classroom: document.querySelectorAll(s).length,
    private: document.querySelectorAll('.fx-library-file[data-origin="private"][data-status="ready"]').length,
    notice: document.querySelector('dialog .notice.error')?.textContent,
  }), materialSelector);
  result('Archivar retira referencias y conserva archivo propio', '0 de aula, 1 privado, aviso de acceso', after, after.classroom === 0 && after.private === 1 && after.notice.includes('ya no está disponible'));
  await capture('archive-context');
  await act('fx-tray-close');
  await click('.fx-composer button[type=submit]');
  await waitFor('.fx-message.user');
  const state = await read();
  const thread = state.foxySpace.threads.find(t => t.role === 'estudiante' && t.folderId === state.folders[0].id);
  const context = thread.messages.find(m => m.who === 'user').context;
  result('Envío después de archivar excluye materiales y actividades docentes', 'Sin classId, 1 fuente privada, 0 actividades', context,
    !context.classId && context.sourceIds.length === 1 && context.activityIds.length === 0);
});
await checkCase('plan-to-study', 1440, 'docente/aula/plan', async () => {
  const title = 'Ficha sintética de contraste';
  const topicId = 'photo-u0-t1';
  await act('teaching-topic', id(topicId));
  await act('teaching-add', id(topicId));
  await page.eval(() => {
    const picker = document.querySelector('#teaching-file');
    const files = new DataTransfer();
    files.items.add(new File(['Ejemplo sin documentación real'], 'contraste-de-auditoria.pdf', {type: 'application/pdf'}));
    picker.files = files.files;
    picker.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await fill('[data-teaching-field=title]', title);
  await act('teaching-prepare');
  await waitFor('[data-teaching-topic-select]');
  const organized = await page.eval(() => ({
    unit: document.querySelector('[data-teaching-unit]').value,
    topic: document.querySelector('[data-teaching-topic-select]').value,
  }));
  result('Subir desde Plan conserva unidad y tema de origen', 'photo-u0 + photo-u0-t1', organized,
    organized.unit === 'photo-u0' && organized.topic === topicId);
  await click('[data-teaching-activity][value=contrast]');
  await act('teaching-publish');
  result('Plan muestra material tras publicar', true, await mainHas(title), await mainHas(title));
  const stored = (await read()).libraryItems.find(m => m.title === title);
  await room('biblioteca');
  result('Biblioteca del aula muestra la misma ficha', true, await mainHas(title), await mainHas(title));
  await changeRole('estudiante');
  await nav('estudiante', 'aulas');
  await board('photo');
  await room('actividades');
  await act('open-activity', id('contrast'));
  await act('material');
  const inActivity = await page.eval(t => document.querySelector('dialog[open]').textContent.includes(t), title);
  result('Ficha de la actividad enlazada abre el material publicado', true, inActivity, inActivity);
  await act('close');
  await click('.focus-header .brand');
  await nav('estudiante', 'carpetas');
  await click('[data-folder="0"]');
  await act('fx-context');
  await act('fx-context-mode', '[data-value=classroom]');
  await act('fx-context-class', id('photo'));
  await act('fx-context-apply');
  await act('fx-library');
  await act('fx-library-filter', '[data-value=classroom]');
  const resource = await page.eval(id => document.querySelector('.fx-library-file[data-origin=classroom] [data-id="' + id + '"]')?.textContent.trim(), stored.id);
  result('Foxy de estudio consulta el mismo material con origen aula', title, resource, resource?.includes(title));
  await capture('shared-material-in-study');
});
await checkCase('activity-history', 1440, 'estudiante/aula/actividades', async () => {
  await act('open-activity', id('light'));
  const first = await debug();
  await click('.focus-header .brand');
  await act('open-activity', id('life'));
  const second = await debug();
  await page.eval(() => history.back());
  await sleep(110);
  await page.eval(() => history.back());
  await sleep(180);
  const back = await debug();
  result('Atrás conserva la actividad específica tras entrar a una de otra aula', first.h1, { first, second, back }, back.h1 === first.h1);
  await capture('wrong-activity-on-back');
});

await checkCase('study-history', 390, 'estudiante/carpetas', async () => {
  await click('[data-folder="0"]');
  const first = await debug();
  await fill('#fx-message', 'Idea para revisar en Fotografía.');
  await click('.fx-folder-back');
  await click('[data-folder="1"]');
  const second = await debug();
  await page.eval(() => history.back());
  await sleep(110);
  await page.eval(() => history.back());
  await sleep(180);
  const back = await debug();
  const draft = await page.eval(() => document.querySelector('#fx-message')?.value);
  result('Atrás conserva carpeta y borrador específicos', 'Mi rincón de fotografía y borrador', { first, second, back, draft },
    back.h1 === first.h1 && draft === 'Idea para revisar en Fotografía.');
  await capture('wrong-folder-on-back');
});
await checkCase('archived-work', 1440, 'docente/aulas', async () => {
  await board('photo');
  await room('ajustes');
  await act('archive-class');
  await act('confirm-archive');
  await changeRole('estudiante');
  const pending = await page.eval(() => Boolean(document.querySelector('#main [data-action="open-activity"][data-id="light"]')));
  result('Inicio no ofrece resolver una actividad archivada', false, pending, !pending);
  await nav('estudiante', 'aulas');
  await act('collection', '[data-value=archived]');
  await board('photo');
  await room('actividades');
  await act('open-activity', id('light'));
  const canStart = await page.eval(() => Boolean(document.querySelector('[data-action="learning-start"]:enabled')));
  result('Aula archivada conserva consulta y bloquea nuevo trabajo', false, canStart, !canStart);
  if (canStart) {
    await act('learning-start');
    await act('question', id(2));
    await act('review-submission');
    await act('confirm-submission');
  }
  const stored = await read();
  result('No se confirma una nueva recepción de actividad archivada', false, Boolean(stored.submitted.light), !stored.submitted.light);
  await capture(canStart ? 'archived-receipt' : 'archived-read-only');
});
await checkCase('invite-rollback', 390, 'estudiante/avisos', async () => {
  await act('nt-open', id('invite-creative'));
  await attemptStorageFailure();
  await act('confirm-join');
  const error = await debug();
  result('Fallo de inscripción informa error y conserva confirmación', 'Diálogo y mensaje de guardado fallido', error,
    Boolean(error.dialog) && error.toast.includes('No pudimos guardar'));
  await act('close');
  await act('nt-toggle', id('wall-photo'));
  const stored = await read();
  const member = stored.classes.some(c => c.id === 'creative');
  result('Tras otro guardado, una inscripción fallida sigue pendiente', 'Sin alta y con invitación', { member, invitation: stored.invitation },
    !member && stored.invitation);
  await capture('invite-state-after-failed-save');
});

await checkCase('profile-chat', 390, 'estudiante/perfil', async () => {
  await fill('#pf-name', 'Nombre sintético');
  await click('[data-pf-action=avatar]');
  await click('input[name=pf-avatar][value=foxy-reader]');
  await click('[data-pf-action=confirm-avatar]');
  await nav('estudiante', 'carpetas');
  await act('menu');
  const before = await page.eval(() => document.querySelector('.sidebar .account b').textContent);
  result('Previsualizar perfil no cambia identidad durante navegación', 'Marina Demo', before, before === 'Marina Demo');
  await click('.sidebar .account');
  await click('form[data-form=demo-profile] button[type=submit]');
  const saved = (await read()).profileDetails.estudiante;
  result('Confirma avatar con el nombre actualizado sin afectar al docente', 'Foxy lector y docente intacto', saved,
    saved.avatar === 'foxy-reader' && (await read()).profile.docente === 'Lucía');
  await nav('estudiante', 'carpetas');
  await click('[data-folder="0"]');
  await fill('#fx-message', 'Una pregunta desde mi perfil de prueba.');
  await click('.fx-composer button[type=submit]');
  await waitFor('.fx-message.user');
  const appearance = await page.eval(() => ({
    message: Boolean(document.querySelector('.fx-message.user .pf-avatar-foxy-reader')),
    navigation: Boolean(document.querySelector('.sidebar .account .pf-avatar-foxy-reader')),
  }));
  result('Avatar guardado aparece en chat propio y navegación', 'Ambos reflejan Foxy lector', appearance, appearance.message && appearance.navigation);
  await capture('chat-avatar');
});
await browser.close();
report.candidateAfter = createHash('sha256').update(await readFile(html)).digest('hex');
await writeFile(path.join(output, query ? 'cross-flows-' + query + '.json' : 'cross-flows.json'), JSON.stringify(report, null, 2));
for (const { name, results, errors } of report.runs) console.log(name, { results: results.map(r => [r.pass, r.name]), errors });
process.exit(Number(report.runs.some(r => r.errors.length || r.results.some(x => !x.pass))));









