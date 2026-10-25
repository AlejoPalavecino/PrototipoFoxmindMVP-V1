if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = 'http://127.0.0.1:49657';
  await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter');
  await page.waitForURL(`${origin}/inicio`); await page.waitForSelector('.fm-home-columns');
  await page.focus('loc=role:button[name*="Notificaciones:"]'); await page.keyboard.press('Enter');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
