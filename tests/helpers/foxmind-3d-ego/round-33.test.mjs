if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.click('.fm3d-shell-nav a[href="/inicio"]'); await page.waitForSelector('.fm-home-columns');
  console.log('PLAN_RETURN_HOME_CLICK_PASS');
  await page.cdp('Network.enable');
  try {
    await page.cdp('Network.setBlockedURLs', { urls: ['*://127.0.0.1:49823/api/v1/home*'] });
    await page.click('loc=role:button[name="Actualizar"]');
    await page.waitForFunction(() => document.body.innerText.includes('No pudimos comprobar tu Inicio'));
    console.log('REAL_HOME_NETWORK_FAILURE', await page.evaluate(() => ({ rows: document.querySelectorAll('.fm-home-row').length,
      staleRoom: document.body.innerText.includes('Biología · preguntas sobre la vida'), error: document.querySelector('[role="alert"]')?.innerText })));
  } finally { await page.cdp('Network.setBlockedURLs', { urls: [] }); }
  await page.click('loc=role:button[name="Reintentar Inicio"]'); await page.waitForSelector('.fm-home-columns');
  console.log('REAL_HOME_NETWORK_RECOVERY', await page.evaluate(() => ({ rows: document.querySelectorAll('.fm-home-row').length })));
  await page.cdp('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  console.log('REDUCED_MOTION_STATE', await page.evaluate(() => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    animations: document.getAnimations().filter(a => a.playState === 'running').length })));
  const before = await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio }));
  for (let i = 0; i < 5; i++) await page.keyboard.press('Control+Equal');
  console.log('NATIVE_ZOOM_200_PROBE', { before, after: await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio,
    overflow: document.documentElement.scrollWidth > innerWidth })) });
  await page.keyboard.press('Tab');
  console.log('ZOOM_KEYBOARD_FOCUS', await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent })));
  await page.keyboard.press('Control+0'); console.log(await page.snapshot({ scope: 'full_page' }));
}
