import { exportScreenPage } from './export-page.test.mjs';
if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = 'http://127.0.0.1:51264';
  await page.goto(`${origin}/agenda`); await page.waitForSelector('[aria-label="Calendario mensual"]');
  await exportScreenPage(page, 'agenda', 1440); await exportScreenPage(page, 'agenda', 390);
  await page.goto(`${origin}/mis-aulas?aula=79437d05-3479-4b64-bd50-2f31551cd7b3`);
  await page.waitForSelector('#classroom-section-title');
  await page.waitForFunction(() => document.body.innerText.includes('Lectura contextual'));
  for (const width of [1440, 390, 320]) await exportScreenPage(page, 'plan', width);
  console.log(await page.snapshot({ scope: 'full_page' }));
}
