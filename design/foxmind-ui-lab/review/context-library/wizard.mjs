import assert from 'node:assert/strict';
import {Browser, sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {pathToFileURL} from 'node:url';

const app = process.argv[2] ? pathToFileURL(process.argv[2]) : new URL('../../01-foxmind.html', import.meta.url);
app.hash = 'estudiante/carpetas';
const storageKey = 'foxmind-ui-lab-v1';
const browser = await Browser.launch();
const click = (page, selector) => page.eval(query => {
  const control = document.querySelector(query);
  if (!control) throw new Error(`Falta el control ${query}`);
  control.click();
}, selector);
const action = (page, name) => click(page, `[data-action="${name}"]`);
const read = page => page.eval(key => JSON.parse(localStorage.getItem(key)), storageKey);
const load = (page, phase) => {
  const url = new URL(app);
  url.searchParams.set('review', phase);
  return page.goto(url.href, {timeoutMs:3000, settleMs:150});
};
const fill = (page, selector, value) => page.eval(({selector, value}) => {
  const field = document.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new Event('input', {bubbles:true}));
}, {selector, value});
const choices = page => page.eval(() => Array.from(document.querySelectorAll('[name="sf-class"]'), option => option.value));
const spaceOn = async (page, selector) => {
  await page.eval(query => document.querySelector(query).focus(), selector);
  for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', {type, key:' ', code:'Space', windowsVirtualKeyCode:32});
};
const form = async (page, name) => {
  await action(page, 'new-folder');
  assert.equal(await page.eval(() => document.querySelectorAll('.class-builder-rail li').length), 4);
  await fill(page, '#f-sf-name', name);
  await fill(page, '#f-sf-subject', 'Arte visual');
  await action(page, 'wizard-next');
};
const fit = page => page.eval(() => {
  const dialog = document.querySelector('#dialog');
  const footer = dialog.querySelector('.dialog-footer').getBoundingClientRect();
  return dialog.scrollWidth <= dialog.clientWidth && footer.bottom <= innerHeight && footer.right <= innerWidth;
});

try {
  const page = await browser.newPage({width:320, height:640, reducedMotion:true});
  await load(page, 'initial');
  await form(page, 'Fotografía con aula');
  await spaceOn(page, '[name="sf-source"][value="class"]');
  assert.equal(await fit(page), true);
  assert.equal(await page.eval(() => document.activeElement.id), 'sf-source-class');
  assert.deepEqual(await choices(page), ['photo', 'bio', 'math']);
  assert.ok(await page.eval(() => document.querySelector('[data-action="wizard-next"]').disabled));
  await spaceOn(page, '[name="sf-class"][value="photo"]');
  assert.equal(await page.eval(() => document.activeElement.value), 'photo');
  await action(page, 'wizard-next');
  assert.equal(await page.eval(() => document.querySelector('#sf-unit-0').value), 'La luz');
  assert.equal(await page.eval(() => document.querySelector('#sf-topic-0-0').value), 'Exposición');
  await fill(page, '#sf-topic-0-0', 'Luz de mi barrio');
  await action(page, 'wizard-prev');
  await click(page, '[name="sf-source"][value="own"]');
  await action(page, 'sf-upload');
  await sleep(1800);
  await click(page, '[name="sf-method"][value="manual"]');
  await action(page, 'wizard-next');
  assert.equal(await page.eval(() => document.querySelector('#sf-unit-0').value), '');
  await fill(page, '#sf-unit-0', 'Unidad propia');
  await fill(page, '#sf-topic-0-0', 'Tema propio');
  await action(page, 'wizard-prev');
  await click(page, '[name="sf-source"][value="class"]');
  await action(page, 'wizard-next');
  assert.equal(await page.eval(() => document.querySelector('#sf-topic-0-0').value), 'Luz de mi barrio');
  await action(page, 'wizard-save');
  assert.equal((await read(page)).folderDrafts[0].savedStep, 2);
  await load(page, 'resume');
  await click(page, '[data-action="sf-collection"][data-value="drafts"]');
  await action(page, 'sf-resume');
  await action(page, 'wizard-prev');
  await click(page, '[name="sf-source"][value="own"]');
  await action(page, 'wizard-next');
  assert.equal(await page.eval(() => document.querySelector('#sf-topic-0-0').value), 'Tema propio');
  await action(page, 'wizard-prev');
  await click(page, '[name="sf-source"][value="class"]');
  await action(page, 'wizard-next');
  await action(page, 'wizard-next');
  assert.equal(await fit(page), true);
  assert.match(await page.eval(() => document.querySelector('.sf-linked-review').textContent), /Fotografía y luz/);
  await action(page, 'wizard-create');
  const linked = (await read(page)).folders.at(-1);
  assert.equal(linked.linkedClassId, 'photo');
  assert.equal(linked.unitTopics[0][0], 'Luz de mi barrio');
  assert.equal(linked.materials[0].title, 'Programa de ejemplo.pdf');
  assert.equal(await page.eval(() => document.querySelector('.sf-linked-badge').textContent.trim()), 'Fotografía y luz');

  const desktop = await browser.newPage({width:1440, height:900, reducedMotion:true});
  await load(desktop, 'linked-only');
  await form(desktop, 'Carpeta sin archivo de programa');
  await click(desktop, '[name="sf-source"][value="class"]');
  await click(desktop, '[name="sf-class"][value="math"]');
  await action(desktop, 'wizard-next');
  await action(desktop, 'wizard-next');
  await action(desktop, 'wizard-create');
  const linkedOnly = (await read(desktop)).folders.at(-1);
  assert.equal(linkedOnly.linkedClassId, 'math');
  assert.deepEqual(linkedOnly.materials, []);

  await load(desktop, 'stale');
  await form(desktop, 'Carpeta con vínculo pendiente');
  await click(desktop, '[name="sf-source"][value="class"]');
  await click(desktop, '[name="sf-class"][value="photo"]');
  await action(desktop, 'wizard-next');
  await action(desktop, 'wizard-next');
  await action(desktop, 'wizard-save');
  await desktop.eval(key => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.classArchived.push('photo');
    saved.classes.find(item => item.id === 'bio').roster = ['Valentina'];
    localStorage.setItem(key, JSON.stringify(saved));
  }, storageKey);
  await load(desktop, 'access-lost');
  await click(desktop, '[data-action="sf-collection"][data-value="drafts"]');
  await action(desktop, 'sf-resume');
  await action(desktop, 'wizard-create');
  assert.match(await desktop.eval(() => document.querySelector('#wizard-error').textContent), /ya no está disponible/i);
  assert.deepEqual(await choices(desktop), ['math']);
  assert.equal((await read(desktop)).folderDrafts.length, 1);
  assert.ok(!(await read(desktop)).folders.some(f => f.name === 'Carpeta con vínculo pendiente'));
  await click(desktop, '[name="sf-source"][value="own"]');
  await action(desktop, 'sf-upload');
  await sleep(1800);
  await click(desktop, '[name="sf-method"][value="manual"]');
  await action(desktop, 'wizard-next');
  await fill(desktop, '#sf-unit-0', 'Unidad recuperada');
  await fill(desktop, '#sf-topic-0-0', 'Tema recuperado');
  await action(desktop, 'wizard-next');
  await action(desktop, 'wizard-create');
  const own = (await read(desktop)).folders.at(-1);
  assert.equal(own.linkedClassId, undefined);
  assert.equal(own.materials[0].title, 'Programa de ejemplo.pdf');
  console.log('Asistente de cuatro pasos, vínculo opcional, currículo editable, cambio de origen, borrador, acceso revocado y flujo propio verificados.');
} finally {
  await browser.close();
}
