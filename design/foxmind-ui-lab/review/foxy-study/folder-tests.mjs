import assert from 'node:assert/strict';
import {Browser, sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {pathToFileURL} from 'node:url';

const app = process.argv[2] ? pathToFileURL(process.argv[2]) : new URL('../../01-foxmind.html', import.meta.url);
app.hash = 'estudiante/carpetas';
const browser = await Browser.launch();
const click = (page, selector) => page.eval(query => document.querySelector(query).click(), selector);
const action = (page, name) => click(page, `[data-action="${name}"]`);
const read = page => page.eval(() => JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')));
const fill = (page, selector, value) => page.eval(({selector, value}) => {
  const field = document.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new Event('input', {bubbles:true}));
}, {selector, value});

try {
  const page = await browser.newPage({width:390, height:844, reducedMotion:true});
  await page.goto(app.href, {timeoutMs:3000, settleMs:150});
  await action(page, 'new-folder');
  assert.equal(await page.eval(() => document.querySelectorAll('.class-builder-rail li').length), 4,
    'La carpeta reutiliza el rail de cuatro pasos de Crear aula');
  await action(page, 'wizard-next');
  assert.equal(await page.eval(() => document.activeElement.getAttribute('aria-invalid')), 'true');
  await fill(page, '[data-sf-field="name"]', 'Mi carpeta de prueba');
  await fill(page, '[data-sf-field="subject"]', 'Arte visual');
  await click(page, '[name="sf-cover"][value="math"]');
  await action(page, 'wizard-next');
  assert.equal(await page.eval(() => document.querySelector('.class-methods').disabled), true);
  await action(page, 'sf-upload');
  await sleep(1800);
  await click(page, '[name="sf-method"][value="manual"]');
  await action(page, 'wizard-next');
  await fill(page, '[data-sf-unit="0"]', 'Componer');
  await fill(page, '[data-sf-topic="0"][data-index="0"]', 'Encuadre');
  await action(page, 'sf-add-topic');
  await fill(page, '[data-sf-topic="0"][data-index="1"]', 'Profundidad');
  await action(page, 'wizard-save');
  const saved = await read(page);
  assert.equal(saved.folderDrafts[0].savedStep, 2);
  assert.deepEqual(saved.folderDrafts[0].unitTopics, [['Encuadre', 'Profundidad']]);
  assert.equal(saved.drafts.length, 0);
  const reopened = new URL(app);
  reopened.search = '?review=draft';
  await page.goto(reopened.href, {timeoutMs:3000, settleMs:150});
  await click(page, '[data-action="sf-collection"][data-value="drafts"]');
  await action(page, 'sf-resume');
  await fill(page, '[data-sf-topic="0"][data-index="1"]', 'Perspectiva');
  await action(page, 'close');
  assert.equal(await page.eval(() => document.activeElement.dataset.action), 'sf-keep-editing');
  await action(page, 'sf-keep-editing');
  assert.equal(await page.eval(() => document.querySelector('[data-sf-topic="0"][data-index="1"]').value), 'Perspectiva');
  await action(page, 'wizard-next');
  assert.match(await page.eval(() => document.querySelector('.class-plan-summary').textContent), /Encuadre.*Perspectiva/s);
  await page.eval(() => {
    window.folderTestSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw Error('Guardado bloqueado para la prueba'); };
  });
  await action(page, 'wizard-create');
  assert.equal(await page.eval(() => document.querySelector('#dialog').open), true);
  assert.equal(await page.eval(() => document.querySelector('#toast').dataset.tone), 'error');
  assert.equal((await read(page)).folderDrafts.length, 1);
  await page.eval(() => { Storage.prototype.setItem = window.folderTestSetItem; });
  await action(page, 'wizard-create');
  const created = await read(page);
  assert.equal(created.folders.length, saved.folders.length + 1);
  assert.equal(created.selectedFolder, created.folders.length - 1);
  assert.equal(created.folderDrafts.length, 0);
  assert.deepEqual(created.folders.at(-1).unitTopics, [['Encuadre', 'Perspectiva']]);
  assert.equal(created.folders.at(-1).materials[0].kind, 'PDF');
  assert.match(created.folders.at(-1).id, /^folder-/);
  assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true);

  const compact = await browser.newPage({width:320, height:640, reducedMotion:true});
  await compact.goto(app.href, {timeoutMs:3000, settleMs:150});
  await action(compact, 'new-folder');
  const fit = () => compact.eval(() => {
    const d = document.querySelector('#dialog');
    const footer = d.querySelector('.dialog-footer').getBoundingClientRect();
    return d.scrollWidth <= d.clientWidth && footer.bottom <= innerHeight && footer.right <= innerWidth;
  });
  assert.equal(await fit(), true);
  await fill(compact, '[data-sf-field="name"]', 'Células y ambiente');
  await fill(compact, '[data-sf-field="subject"]', 'Biología');
  await action(compact, 'wizard-next');
  await action(compact, 'sf-upload');
  await sleep(1800);
  await click(compact, '[name="sf-method"][value="ai"]');
  await action(compact, 'wizard-next');
  assert.ok(await compact.eval(() => document.querySelector('.class-process')));
  await sleep(2700);
  assert.equal(await fit(), true);
  assert.equal(await compact.eval(() => document.querySelector('[data-sf-topic="0"]').value), 'Conceptos clave de Biología');
  await fill(compact, '[data-sf-unit="0"]', 'Organismos');
  await action(compact, 'wizard-prev');
  await action(compact, 'wizard-next');
  assert.equal(await compact.eval(() => document.querySelector('[data-sf-unit="0"]').value), 'Organismos');
  await action(compact, 'wizard-next');
  assert.equal(await fit(), true);
  await action(compact, 'close');
  await action(compact, 'sf-discard');
  assert.equal(await compact.eval(() => document.querySelector('#dialog').open), false);

  const desktop = await browser.newPage({width:1440, height:900});
  await desktop.goto(new URL('#docente/aulas', app.href).href, {timeoutMs:3000, settleMs:150});
  await action(desktop, 'new-class');
  assert.equal(await desktop.eval(() => document.querySelector('#dialog-title').textContent), 'Crear un aula');
  await action(desktop, 'wizard-next');
  assert.equal(await desktop.eval(() => document.activeElement.id), 'f-name');
  await action(desktop, 'close');
  assert.equal(await desktop.eval(() => document.querySelector('#dialog').open), false);
  console.log('Carpeta manual y con Foxy, validación, borrador tras volver a cargar, cancelación, rollback, creación, layout a 320px y Crear aula verificados.');
} finally {
  await browser.close();
}
