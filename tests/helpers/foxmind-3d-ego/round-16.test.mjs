if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = 'http://127.0.0.1:49657';
  await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter'); await page.waitForURL(`${origin}/inicio`);
  await page.goto(`${origin}/mis-aulas?aula=99a28785-900b-4ade-b168-4f7b0cf06406`); await page.waitForSelector('#classroom-section-title');
  await page.focus('loc=role:button[name="Actividades"]'); await page.keyboard.press('Enter');
  await page.focus('loc=role:button[name="Generar con IA"]'); await page.keyboard.press('Enter');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
