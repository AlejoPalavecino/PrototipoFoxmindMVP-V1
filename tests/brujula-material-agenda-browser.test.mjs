import test from 'node:test';
import assert from 'node:assert/strict';
import { withJourney, ok, rootOf, selectClassroomSection } from './p9-journey-helpers-current.mjs';
import { openClassroom, planPdf } from './p6-integration-helpers.mjs';

test('Publishing an approved PDF and editing one private weekly event run through the real UI', { timeout: 330000 }, async () => {
  await withJourney('material-agenda', async ({ T, S, room, runtime }) => {
    const root = rootOf(room), title = 'Apunte de clase';
    const openLibrary = async page => {
      await openClassroom(page, runtime.origin, 'P9 material-agenda classroom');
      await selectClassroomSection(page, 'library', 'Biblioteca');
    };
    const bytes = await planPdf(title);
    await openLibrary(T.page);
    const library = T.page.getByRole('region', { name: 'Biblioteca del aula', exact: true });
    await library.getByRole('button', { name: 'Subir archivo', exact: true }).click();
    const upload = T.page.getByRole('dialog', { name: 'Subir archivo', exact: true });
    await upload.getByLabel('Archivo del material', { exact: true }).setInputFiles({
      name: 'apunte.pdf', mimeType: 'application/pdf', buffer: bytes,
    });
    await upload.getByRole('status').filter({ hasText: 'apunte.pdf' })
      .getByText('Archivo aprobado. Ya podés publicarlo.', { exact: true }).waitFor();
    await upload.getByLabel('Nombre del material', { exact: true }).fill(` ${title} `);
    await upload.getByLabel('Descripción (opcional)', { exact: true }).fill('Guía de lectura para el aula');
    await upload.getByRole('button', { name: 'Preparar y continuar', exact: true }).click();
    assert.equal((await ok(S.page, 'GET', `${root}/library`)).some(material => material.title === title), false);
    await upload.getByRole('button', { name: 'Publicar material', exact: true }).click();
    await upload.waitFor({ state: 'hidden' });
    await library.getByRole('article', { name: title, exact: true }).waitFor();

    const material = (await ok(S.page, 'GET', `${root}/library`)).find(item => item.title === title);
    assert.ok(material?.ready);
    assert.equal(material.description, 'Guía de lectura para el aula');
    await openLibrary(S.page);
    const card = S.page.getByRole('article', { name: title, exact: true });
    await card.getByRole('button', { name: `Abrir material: ${title}`, exact: true }).click();
    const reader = S.page.getByRole('region', { name: `Lectura de ${title}`, exact: true });
    await reader.getByText('Guía de lectura para el aula', { exact: true }).waitFor();
    assert.equal(await reader.getByRole('button', { name: 'Editar datos', exact: true }).count(), 0);
    const preview = await reader.getByRole('link', { name: 'Abrir archivo', exact: true }).getAttribute('href');
    const download = await reader.getByRole('link', { name: 'Descargar material', exact: true }).getAttribute('href');
    for (const [href, isPreview] of [[preview, true], [download, false]]) {
      assert.ok(href);
      const url = new URL(href, runtime.origin);
      assert.equal(url.pathname, `/api/v1/files/${material.fileId}/content`);
      assert.equal(url.searchParams.get('mode') === 'preview', isPreview);
      const response = await S.page.request.get(url.href);
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-type'], /application\/pdf/);
      assert.deepEqual(await response.body(), bytes);
    }

    await T.page.goto(runtime.origin + '/agenda');
    await T.page.getByRole('button', { name: 'Crear evento', exact: true }).click();
    const creation = T.page.getByRole('dialog', { name: 'Un momento en tu agenda', exact: true });
    const date = await creation.getByLabel('Fecha', { exact: true }).inputValue();
    const until = new Date(Date.parse(date + 'T12:00Z') + 14 * 86400000).toISOString().slice(0, 10);
    await creation.getByLabel('Título', { exact: true }).fill('Clase semanal privada');
    await creation.getByRole('checkbox', { name: 'Todo el día', exact: true }).check();
    await creation.getByLabel('Repetición', { exact: true }).selectOption('WEEKLY');
    await creation.getByLabel('Repetir hasta (incluido)', { exact: true }).fill(until);
    const [response] = await Promise.all([
      T.page.waitForResponse(result => /\/agenda\/events\/[^/]+$/.test(new URL(result.url()).pathname) && result.request().method() === 'PUT'),
      creation.getByRole('button', { name: 'Crear evento', exact: true }).click(),
    ]);
    assert.equal(response.status(), 201);
    const event = await response.json(), eventUrl = `${runtime.origin}/agenda?event=${event.id}&date=${date}`;
    assert.deepEqual(event.repeat, { kind: 'WEEKLY', untilDate: until });

    await T.page.goto(eventUrl);
    await T.page.getByRole('dialog', { name: 'Tu evento', exact: true }).getByRole('button', { name: 'Editar evento', exact: true }).click();
    const scope = T.page.getByRole('dialog', { name: 'Editar evento recurrente', exact: true });
    await scope.getByRole('button', { name: 'Solo este evento', exact: true }).click();
    const editor = T.page.getByRole('dialog', { name: 'Editar evento', exact: true });
    await editor.waitFor();
    assert.equal(await T.page.locator('dialog[open]').count(), 1, 'Scope closes before the editor opens');
    await editor.getByLabel('Título', { exact: true }).fill('Clase trasladada');
    const [changed] = await Promise.all([
      T.page.waitForResponse(result => new URL(result.url()).pathname.endsWith(`/occurrences/${date}`) && result.request().method() === 'PATCH'),
      editor.getByRole('button', { name: 'Guardar cambios', exact: true }).click(),
    ]);
    assert.equal(changed.status(), 200);
    const canonical = await ok(T.page, 'GET', `/agenda/events/${event.id}`);
    assert.equal(canonical.title, 'Clase semanal privada');
    assert.deepEqual(canonical.repeat, event.repeat);
    assert.equal(canonical.exceptions.length, 1);
    assert.equal(canonical.exceptions[0].date, date);
    assert.equal(canonical.exceptions[0].replacement.title, 'Clase trasladada');
    assert.equal((await S.page.request.get(`${runtime.origin}/api/v1/agenda/events/${event.id}`)).status(), 403);
  });
});
