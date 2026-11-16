import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Browser, sleep } from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';

const app = process.argv[2] ? pathToFileURL(process.argv[2]) : new URL('../../01-foxmind.html', import.meta.url);
app.hash = 'docente/perfil';
const browser = await Browser.launch();
const options = { timeoutMs: 3000, settleMs: 100 };
const editAvatar = '[data-pf-action="avatar"]';
const confirmAvatar = '[data-pf-action="confirm-avatar"]';
const discard = '[data-pf-action="discard"]';
const save = '.pf-form [type="submit"]';
const read = page => page.eval(() => JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')));
const value = (page, selector) => page.eval(q => document.querySelector(q)?.value, selector);
const text = (page, selector) => page.eval(q => document.querySelector(q)?.textContent, selector);
const visible = (page, selector) => page.eval(q => Boolean(document.querySelector(q)?.getClientRects().length), selector);
const click = (page, selector) => page.eval(q => {
  const target = document.querySelector(q);
  target.focus();
  target.click();
}, selector);
const fill = (page, selector, value) => page.eval(({ selector, value }) => {
  const target = document.querySelector(selector);
  target.value = value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
}, { selector, value });
const key = async (page, key, shift = false) => {
  const codes = { Escape: 27, Tab: 9, ArrowRight: 39 };
  const details = { key, code: key, windowsVirtualKeyCode: codes[key], modifiers: shift ? 8 : 0 };
  await page.send('Input.dispatchKeyEvent', { ...details, type: 'keyDown' });
  await page.send('Input.dispatchKeyEvent', { ...details, type: 'keyUp' });
};
const route = (page, hash) => page.eval(hash => new Promise(resolve => {
  window.addEventListener('hashchange', () => resolve(), { once: true });
  location.hash = hash;
}), hash);

const verifyChatAvatar = async (page, avatar) => {
  await fill(page, '#fx-message', 'Mensaje sintético para comprobar el avatar.');
  await click(page, 'form[data-form="fx-chat"] [type="submit"]');
  const selector = '.fx-message.user .pf-avatar-' + avatar;
  for (let attempt = 0; attempt < 10 && !await visible(page, selector); attempt++) {
    await sleep(100);
  }
  assert.equal(await visible(page, selector), true);
};

try {
  const page = await browser.newPage({ width: 390, height: 844, reducedMotion: true });
  await page.goto(app.href, options);
  assert.equal(await value(page, '#pf-surname'), 'Demo', 'Mi perfil permite editar el apellido de la cuenta.');
  assert.equal(await text(page, 'main h1'), 'Mi perfil');
  assert.equal(await value(page, '#pf-name'), 'Lucía');
  assert.deepEqual(await page.eval(() => ['pf-email', 'pf-role'].map(id => document.getElementById(id).readOnly)), [true, true]);
  assert.equal(await value(page, '#pf-role'), 'Docente');
  assert.equal(await page.eval(() => document.querySelectorAll('#main input[type="password"]').length), 0);
  assert.equal(await visible(page, '#pf-live-avatar .pf-avatar-photo'), true);

  await click(page, editAvatar);
  assert.equal(await page.eval(() => document.activeElement.id), 'dialog-title');
  assert.equal(await page.eval(() => [...document.querySelectorAll('.pf-options input')].length), 6);
  await key(page, 'Tab', true);
  assert.equal(await page.eval(() => document.activeElement.dataset.pfAction), 'confirm-avatar');
  await key(page, 'Tab');
  assert.equal(await page.eval(() => document.activeElement.dataset.action), 'close');
  await page.eval(() => document.querySelector('.pf-options input:checked').focus());
  await key(page, 'ArrowRight');
  assert.equal(await text(page, '#pf-picker-label'), 'Mis iniciales');
  await key(page, 'Escape');
  assert.equal(await page.eval(() => document.querySelector('#dialog').open), false);
  assert.equal(await page.eval(() => document.activeElement.dataset.pfAction), 'avatar');
  assert.equal(await visible(page, '#pf-live-avatar .pf-avatar-photo'), true, 'Escape descarta la elección pendiente.');

  await fill(page, '#pf-name', 'Clara');
  await click(page, editAvatar);
  await click(page, '[name="pf-avatar"][value="initials"]');
  assert.equal(await text(page, '#pf-picker-image'), 'CD');
  await click(page, confirmAvatar);
  assert.equal(await text(page, '#pf-live-avatar'), 'CD');
  assert.equal(await text(page, '.account b'), 'Lucía Demo');
  assert.equal(await read(page), null);

  await route(page, 'docente/avisos');
  await page.eval(() => {
    window.pfOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Cuota simulada'); };
  });
  await click(page, '[data-action="nt-toggle"][data-id="delivery-r1"]');
  assert.equal(await page.eval(() => document.querySelector('#toast').dataset.tone), 'error');
  await page.eval(() => { Storage.prototype.setItem = window.pfOriginalSetItem; });
  await route(page, 'docente/perfil');
  assert.equal(await value(page, '#pf-name'), 'Clara', 'Un fallo de guardado en Avisos conserva el borrador de perfil.');
  assert.equal(await text(page, '#pf-live-avatar'), 'CD');

  await route(page, 'estudiante/perfil');
  assert.equal(await value(page, '#pf-name'), 'Marina');
  assert.equal(await value(page, '#pf-role'), 'Estudiante');
  assert.equal(await visible(page, '#pf-live-avatar .pf-avatar-photo'), true);
  await route(page, 'docente/perfil');
  assert.equal(await value(page, '#pf-name'), 'Clara');
  await click(page, discard);
  assert.equal(await value(page, '#pf-name'), 'Lucía');
  assert.equal(await visible(page, '#pf-live-avatar .pf-avatar-photo'), true);

  await fill(page, '#pf-surname', '   ');
  await click(page, save);
  assert.equal(await page.eval(() => document.activeElement.id), 'pf-surname');
  assert.equal(await text(page, '#pf-surname-error'), 'Completá tu apellido.');
  await fill(page, '#pf-surname', '𠮷'.repeat(81));
  await click(page, save);
  assert.equal(await text(page, '#pf-surname-error'), 'Usá hasta 80 caracteres.');
  await fill(page, '#pf-surname', '𠮷'.repeat(80));
  const escapedName = '  <b data-pf-fixture="x">Clara</b>  ';
  await fill(page, '#pf-name', escapedName);
  await click(page, editAvatar);
  await click(page, '[name="pf-avatar"][value="foxy-reader"]');
  assert.equal(await page.eval(() => {
    const image = document.querySelector('#pf-picker-image img.pf-avatar-foxy-reader');
    return Boolean(image?.complete && image.naturalWidth > 0);
  }), true, 'La vista previa usa el recurso local de Foxy lector.');
  await click(page, confirmAvatar);

  await page.eval(() => {
    window.pfOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Cuota simulada'); };
  });
  await click(page, save);
  assert.equal(await visible(page, '#pf-save-error.notice.error'), true);
  assert.equal(await text(page, '.account b'), 'Lucía Demo');
  assert.equal(await read(page), null);
  assert.equal(await value(page, '#pf-name'), escapedName);
  assert.equal(await visible(page, '#pf-live-avatar .pf-avatar-foxy-reader'), true);
  await route(page, 'estudiante/perfil');
  await route(page, 'docente/perfil');
  assert.equal(await text(page, '.account b'), 'Lucía Demo', 'El fallo también revierte el estado confirmado en memoria.');
  await page.eval(() => { Storage.prototype.setItem = window.pfOriginalSetItem; });
  await click(page, save);
  const saved = await read(page);
  assert.deepEqual(saved.profile, { docente: escapedName, estudiante: 'Marina' });
  assert.deepEqual(saved.profileDetails.docente, { surname: '𠮷'.repeat(80), avatar: 'foxy-reader' });
  assert.equal(await text(page, '.account b'), escapedName + ' ' + '𠮷'.repeat(80));
  assert.equal(await page.eval(() => document.querySelectorAll('[data-pf-fixture]').length), 0);

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: width === 320 ? 640 : 900 });
    assert.equal(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), true, 'Perfil dentro de ' + width);
    await click(page, editAvatar);
    const fit = await page.eval(() => {
      const picker = document.querySelector('#dialog');
      const footer = picker.querySelector('.dialog-footer').getBoundingClientRect();
      return picker.scrollWidth <= picker.clientWidth && footer.bottom <= innerHeight && footer.right <= innerWidth;
    });
    assert.equal(fit, true, 'Selector y acciones dentro de ' + width);
    await key(page, 'Escape');
  }

  const refreshed = new URL(app);
  refreshed.search = '?profile-check=persisted';
  await page.goto(refreshed.href, options);
  assert.equal(await value(page, '#pf-name'), escapedName);
  assert.equal(await visible(page, '.account .pf-avatar-foxy-reader'), true);
  await route(page, 'docente/foxy');
  await verifyChatAvatar(page, 'foxy-reader');
  await route(page, 'estudiante/perfil');
  assert.equal(await text(page, '.account b'), 'Marina Demo');
  assert.equal(await visible(page, '.account .pf-avatar-photo'), true);
  await fill(page, '#pf-surname', 'Ríos');
  await click(page, editAvatar);
  await click(page, '[name="pf-avatar"][value="initials"]');
  await click(page, confirmAvatar);
  await click(page, save);
  assert.equal(await text(page, '.account .pf-avatar-initials'), 'MR');
  assert.equal((await read(page)).profileDetails.docente.avatar, 'foxy-reader');
  await route(page, 'estudiante/estudio');
  await verifyChatAvatar(page, 'initials');

  await route(page, 'docente/perfil');
  await fill(page, '#pf-name', 'Nombre docente sin guardar');
  await route(page, 'estudiante/perfil');
  await fill(page, '#pf-name', 'Nombre estudiante sin guardar');
  await click(page, '[data-action="reset"]');
  await click(page, '[data-action="confirm-reset"]');
  await route(page, 'docente/perfil');
  assert.equal(await value(page, '#pf-name'), 'Lucía', 'Reiniciar la demo borra el borrador docente.');
  await route(page, 'estudiante/perfil');
  assert.equal(await value(page, '#pf-name'), 'Marina', 'Reiniciar la demo borra el borrador estudiante.');
  assert.equal(await visible(page, '#pf-live-avatar .pf-avatar-photo'), true);

  assert.deepEqual(page.consoleErrors, []);
  console.log('PASS perfil: datos, estados y persistencia por rol, guardado fallido y reintento, avatar en chat, Escape, foco y layout a 5 anchos.');
} finally {
  await browser.close();
}
