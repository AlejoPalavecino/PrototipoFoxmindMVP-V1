if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await page.click('loc=role:button[name="Abrir menú de navegación"]');
  console.log('DRAWER', await page.snapshot());
  await page.keyboard.press('Escape');
  console.log('DRAWER_ESCAPE', await page.evaluate(() => ({ open: document.querySelector('#fm3d-navigation-drawer')?.open,
    focus: document.activeElement?.getAttribute('aria-label') })));
  await page.goto('http://127.0.0.1:63949/settings');
  await page.waitForSelector('input[name="currentPassword"]');
  console.log('SETTINGS_FIELDS', await page.evaluate(() => ({ names: [...document.querySelectorAll('input')].map(n => n.name),
    overflow: document.documentElement.scrollWidth > innerWidth, width: innerWidth })));
  console.log(await page.snapshot({ scope: 'full_page' }));
}
