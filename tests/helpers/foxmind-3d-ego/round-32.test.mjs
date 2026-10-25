import { exportScreenPage } from './export-page.test.mjs';
if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.focus('.fm3d-shell-nav a[href="/inicio"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('.fm-home-columns');
  await page.focus('button[aria-label="Entrar al aula: Biología · preguntas sobre la vida"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('#classroom-section-title');
  await page.waitForFunction(() => document.body.innerText.includes('Lectura contextual'));
  console.log('REAL_PLAN_HEADER_HOME_DESKTOP', await page.evaluate(() => {
    const box = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { title: document.querySelector('.fm3-room-heading h1')?.innerText, context: document.querySelector('.fm3-room-context')?.innerText,
      role: document.querySelector('.fm3-room-heading .fm3-membership')?.innerText,
      header: box('.fm3-room-header'), heading: box('.fm3-room-heading'), illustration: box('.p5-room-cover') };
  }));
  await exportScreenPage(page, 'plan-from-home', 1440, 1000, 'group5');
  await exportScreenPage(page, 'plan-from-home', 320, 1000, 'group5');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.focus('.fm3d-shell-nav a[href="/inicio"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('.fm-home-columns'); await page.cdp('Network.enable');
  try {
    await page.cdp('Network.setBlockedURLs', { urls: ['*://127.0.0.1:49823/api/v1/home*'] });
    await page.focus('loc=role:button[name="Actualizar"]'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.innerText.includes('No pudimos comprobar tu Inicio'));
    console.log('REAL_HOME_NETWORK_FAILURE', await page.evaluate(() => ({ rows: document.querySelectorAll('.fm-home-row').length,
      staleRoom: document.body.innerText.includes('Biología · preguntas sobre la vida'), error: document.querySelector('[role="alert"]')?.innerText })));
  } finally { await page.cdp('Network.setBlockedURLs', { urls: [] }); }
  await page.focus('loc=role:button[name="Reintentar Inicio"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('.fm-home-columns');
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
  await page.keyboard.press('Control+0');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
