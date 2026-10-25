if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = 'http://127.0.0.1:51264';
  await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
  await page.fill('input[name="email"]', 'mixed-3d@example.test'); await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter'); await page.waitForURL(`${origin}/inicio`);
  await page.waitForSelector('.fm-home-columns'); await page.cdp('Network.enable');
  try {
    await page.cdp('Network.setBlockedURLs', { urls: ['*://127.0.0.1:51264/api/v1/home*'] });
    await page.focus('loc=role:button[name="Actualizar"]'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.innerText.includes('No pudimos comprobar tu Inicio'));
    console.log('REAL_NETWORK_FAILURE', await page.evaluate(() => ({ rows: document.querySelectorAll('.fm-home-row').length,
      oldClassroomVisible: document.body.innerText.includes('Biología · preguntas sobre la vida'), error: document.querySelector('[role="alert"]')?.innerText })));
  } finally { await page.cdp('Network.setBlockedURLs', { urls: [] }); }
  await page.focus('loc=role:button[name="Reintentar Inicio"]'); await page.keyboard.press('Enter'); await page.waitForSelector('.fm-home-columns');
  console.log('REAL_NETWORK_RECOVERY', await page.evaluate(() => ({ rows: document.querySelectorAll('.fm-home-row').length })));
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const before = await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio }));
  try {
    for (let i = 0; i < 5; i++) await page.keyboard.press('Control+Equal');
    console.log('NATIVE_ZOOM_PROBE', { before, after: await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio,
      overflow: document.documentElement.scrollWidth > innerWidth })) });
  } catch (error) { console.log('NATIVE_ZOOM_UNAVAILABLE', error.message); }
  finally { await page.keyboard.press('Control+0'); }
  console.log(await page.snapshot());
}
