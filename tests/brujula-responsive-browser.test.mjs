import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { openClassroom } from './p6-integration-helpers.mjs';
import { withJourney, ok, request, rootOf, createActivity, startPublic, inviteExplicitly, selectClassroomSection } from './p9-journey-helpers-current.mjs';

test('Brújula real screens: both roles, classroom sections, agenda, account, Foxy availability and peer privacy', { timeout: 330000 }, async () => {
  await withJourney('brujula-layout', async world => {
    const { T, S, P, room, runtime, scratch } = world;
    const capture = async (page, name, widths) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
        const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, heading: document.querySelector('h1')?.textContent }));
        assert.equal(geometry.overflow, false, `${name}/${width}: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.heading, name);
        await page.screenshot({ path: join(scratch, `${name}-${width}.png`), fullPage: true, animations: 'disabled' });
      }
    };
    for (const [role, page] of [['teacher',T.page],['student',S.page]]) {
      for (const route of ['mis-aulas','agenda','profile','settings', ...(role === 'teacher' ? ['foxy-ai'] : [])]) {
        await page.goto(`${runtime.origin}/${route}`);
        await page.locator('h1').waitFor();
        await capture(page, `${role}-${route}`, [390,768,1280,1440]);
      }
      await openClassroom(page,runtime.origin,'P9 brujula-layout classroom');
      const sections = [['plan','Plan'],['wall','Muro'],['library','Biblioteca'],['activities','Actividades'],['progress',role === 'teacher'?'Progreso':'Mi progreso'],['members',role === 'teacher'?'Alumnos':'Compañeros'],...(role === 'teacher'?[['history','Historial'],['settings','Configuración']]:[])];
      for (const [key,label] of sections) {
        await selectClassroomSection(page,key,label);
        await capture(page,`${role}-classroom-${key}`,[390,1440]);
      }
    }
    await inviteExplicitly(world,P);
    const activity = await createActivity(world,'ASSIGNMENT');
    const state = await startPublic(world,activity), id = state.attempt.id, root = rootOf(room);
    for (const suffix of ['history','receipt','grading','result']) {
      assert.equal((await request(P.page,'GET',`${root}/attempts/${id}/${suffix}`)).status,403,`peer ${suffix}`);
    }
    assert.equal((await request(S.page,'GET',`${root}/members/${P.user.id}/progress`)).status,403);
    assert.equal((await request(S.page,'GET','/foxy-ai/conversations')).status,403);
    assert.equal((await ok(S.page,'GET',`${root}/activities/${activity.id}/session`)).attempt.id,id);
  },{peer:true});
});
