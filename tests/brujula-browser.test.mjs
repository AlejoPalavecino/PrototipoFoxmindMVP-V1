import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { openClassroom } from './p6-integration-helpers.mjs';
import { withJourney, ok, request, rootOf, detail, createActivity, changeActivity, startPublic, editorHeaders,
  selectClassroomSection, publishSavedGrade, openOwnResult } from './p9-journey-helpers-current.mjs';

test('Brújula real: public rubric, exact review, private publication, responsive navigation and event preview', { timeout: 330000 }, async () => {
  await withJourney('brujula', async world => {
    const { runtime, T, S, room, scratch } = world, root = rootOf(room);
    await openClassroom(T.page, runtime.origin, 'P9 brujula classroom');
    await selectClassroomSection(T.page, 'activities', 'Actividades');
    const before = (await ok(T.page, 'GET', `${root}/activities`)).activities.length;
    await T.page.getByRole('button', { name: 'Crear actividad', exact: true }).click();
    const choice = T.page.getByRole('dialog', { name: 'Crear actividad', exact: true });
    await choice.getByRole('button', { name: 'Crear manualmente', exact: true }).waitFor();
    await choice.getByRole('button', { name: /Crear con IA/ }).waitFor();
    assert.equal((await ok(T.page, 'GET', `${root}/activities`)).activities.length, before);
    await choice.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
    const activity = await createActivity(world, 'ASSIGNMENT', { publish: false, title: 'Brújula con rúbrica' });
    await T.page.getByRole('button', { name: 'Actualizar actividades', exact: true }).click();
    const card = T.page.getByRole('article', { name: activity.title, exact: true });
    await card.getByText('Más opciones', { exact: true }).click();
    await card.getByRole('button', { name: 'Continuar borrador', exact: true }).click();
    const editor = T.page.getByRole('region', { name: 'Editar actividad', exact: true });
    await editor.getByRole('heading', { name: 'Paso 1 de 3 · Selección y origen', exact: true }).waitFor();
    await editor.getByRole('button', { name: 'Continuar', exact: true }).click();
    await editor.getByRole('heading', { name: 'Paso 2 de 3 · Preparar actividad', exact: true }).waitFor();
    await editor.getByRole('button', { name: 'Agregar criterio', exact: true }).click();
    await editor.getByLabel('Criterio 1', { exact: true }).fill('Evidencias y claridad');
    await editor.getByLabel('Descripción del criterio 1', { exact: true }).fill('Explicá la relación entre los conceptos.');
    await editor.getByLabel('Rúbrica opcional para la corrección con IA', { exact: true }).fill('Instrucción privada que no se publica');
    let response = T.page.waitForResponse(r => r.url().endsWith(`${room.id}/activities`) && r.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    assert.equal((await response).status(), 200);
    const criteria = (await ok(T.page, 'GET', `${root}/activities/${activity.id}/preview`)).activity.evaluationRubric;
    assert.deepEqual(criteria, [{ name: 'Evidencias y claridad', description: 'Explicá la relación entre los conceptos.', weight: 100 }]);
    assert.equal((await request(S.page, 'GET', `${root}/activities/${activity.id}/session`)).status, 403);
    await editor.getByRole('button', { name: /Revisar y asignar/ }).click();
    await editor.getByRole('button', { name: 'Guardar borrador', exact: true }).waitFor();
    await editor.getByRole('button', { name: 'Asignar al aula', exact: true }).click();
    const assignment = T.page.getByRole('dialog', { name: 'Asignar actividad al aula', exact: true });
    response = T.page.waitForResponse(r => r.url().endsWith(`${room.id}/activities`) && r.request().method() === 'POST');
    await assignment.getByRole('button', { name: 'Confirmar asignación al aula', exact: true }).click();
    assert.equal((await response).status(), 200);
    await editor.waitFor({ state: 'hidden' });
    const student = await ok(S.page, 'GET', `${root}/activities/${activity.id}/session`);
    assert.deepEqual(student.activity.evaluationRubric, criteria);
    assert.equal('aiGradingRubric' in student.activity, false);
    const started = await startPublic(world, activity), attemptId = started.attempt.id;
    await ok(S.page, 'POST', `${root}/attempts/${attemptId}/submit-practical`, { revision: started.attempt.revision, confirm: true }, editorHeaders(started.editor));
    const home = await ok(T.page, 'GET', '/home?timeZone=UTC');
    const pending = home.modules.review.items.find(row => row.target.attemptId === attemptId);
    assert.ok(pending); assert.equal(pending.studentName, `${S.user.firstName} ${S.user.lastName}`);
    await T.page.goto(`${runtime.origin}/inicio`);
    await T.page.getByRole('button', { name: `Corregir: ${activity.title}`, exact: true }).click();
    await T.page.getByRole('region', { name: 'Corrección privada del intento', exact: true }).waitFor();
    const scoring = T.page.getByRole('group', { name: 'Corrección con rúbrica', exact: true });
    await scoring.getByText('Evidencias y claridad', { exact: true }).waitFor();
    await scoring.getByText('100%', { exact: true }).waitFor();
    assert.equal(await scoring.getByRole('textbox', { name: 'Puntaje de Evidencias y claridad', exact: true }).isEditable(), true);
    for (const width of [390,768,1280,1440]) {
      await T.page.setViewportSize({width,height:900});
      const geometry=await scoring.evaluate(element=>({width:element.querySelector('label').getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));
      assert.ok(geometry.width>80,`Criterion label must remain readable at ${width}: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.overflow,false);
      await T.page.screenshot({path:join(scratch,`grading-${width}.png`),fullPage:true,animations:'disabled'});
    }
    await T.page.setViewportSize({width:1280,height:900});
    await publishSavedGrade(world, attemptId, '8.50', 'Devolución explícita de prueba');
    await openOwnResult(world, activity, attemptId);
    const authContext = await world.browser.newContext();
    try {
      const auth = await authContext.newPage(), authErrors = [];
      auth.on('pageerror', error => authErrors.push(error.message));
      for (const path of ['sign-in', 'register', 'forgot-password']) {
        await auth.goto(`${runtime.origin}/${path}`);
        await auth.getByLabel('Correo electrónico', { exact: true }).waitFor();
        for (const width of [390, 768, 1280, 1440]) {
          await auth.setViewportSize({ width, height: 900 });
          await auth.evaluate(() => document.fonts.ready);
          assert.equal(await auth.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path}/${width}`);
          await auth.screenshot({ path: join(scratch, `auth-${path}-${width}.png`), fullPage: true });
        }
      }
      assert.deepEqual(authErrors, []);
    } finally { await authContext.close(); }

    for (const [role, page] of [['teacher', T.page], ['student', S.page]]) {
      await page.goto(`${runtime.origin}/inicio`);
      await page.locator('.fm-home-panorama').waitFor();
      if(role==='student') {
        const list=page.getByRole('button',{name:'Ver listado',exact:true});
        assert.equal(await list.evaluate(element=>Boolean(element.closest('.fm-home-module--pending>header'))),true);
        await list.click();
        const work=page.getByRole('dialog',{name:'Mis entregas',exact:true});
        await work.getByRole('heading',{name:'Con devolución',exact:true}).waitFor();
        await work.getByRole('button',{name:'Cerrar diálogo',exact:true}).click();
        await work.waitFor({state:'hidden'});
      }
      for (const width of [390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${role}/${width}`);
        await page.screenshot({ path: join(scratch, `${role}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
      await drawer.getByRole('button', { name: /Buscar en FoxMind/ }).click();
      const search = page.getByRole('dialog', { name: 'Buscar en FoxMind', exact: true });
      await search.getByRole('searchbox').fill('configuracion');
      await search.getByRole('link', { name: /Configuración/ }).waitFor();
      await page.keyboard.press('Escape'); await search.waitFor({ state: 'hidden' });
      assert.equal(await drawer.isVisible(), true);
      await page.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).evaluate(el => el === document.activeElement), true);
      await page.goto(`${runtime.origin}/notificaciones`);
      const center = page.getByRole('region', { name: 'Centro de notificaciones', exact: true });
      await center.waitFor();
      await center.getByText('Cargando notificaciones…', { exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await center.getByRole('alert').count(), 0);
      for (const width of [390, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `notifications-${role}/${width}`);
        await page.screenshot({ path: join(scratch, `notifications-${role}-${width}.png`), fullPage: true });
      }

    }
    await T.page.goto(`${runtime.origin}/agenda`);
    await T.page.getByRole('button', { name: 'Crear evento', exact: true }).click();
    const event = T.page.getByRole('dialog', { name: 'Nuevo evento', exact: true });
    await event.getByLabel('Título', { exact: true }).fill('Preparar Brújula');
    await event.getByText('Violeta', { exact: true }).click();
    assert.equal(await event.getByRole('radio', { name: 'Violeta', exact: true }).isChecked(), true);
    await event.getByRole('region', { name: 'Vista previa del evento', exact: true }).getByText('Preparar Brújula', { exact: true }).waitFor();
    response = T.page.waitForResponse(r => r.url().includes('/agenda/events') && r.request().method() === 'PUT');
    await event.getByRole('button', { name: 'Crear evento', exact: true }).click();
    const saved = await response; assert.ok(saved.status() === 200 || saved.status() === 201);
    await event.waitFor({ state: 'hidden' });
    const stored = (await runtime.db.query('SELECT color FROM agenda_events WHERE title=$1', ['Preparar Brújula'])).rows;
    assert.deepEqual(stored, [{ color: 'PURPLE' }]);
  });
});
