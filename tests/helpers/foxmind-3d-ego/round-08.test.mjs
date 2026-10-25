if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  for (const [path, ready] of [['profile', 'input[name="firstName"]'], ['settings', 'input[name="currentPassword"]'], ['mis-aulas', '.entry-classrooms'], ['agenda', '[aria-label="Calendario mensual"]']]) {
    await page.goto(`http://127.0.0.1:59814/${path}`); await page.waitForSelector(ready);
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 1440 / 96, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-${path}-1440-screen-export.test.pdf`, Buffer.from(result.data, 'base64'));
    console.log('PAGE_SCREEN_EXPORT', path, await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
      inputs: [...document.querySelectorAll('input')].map(x => x.name), readonlyEmail: document.querySelector('#profile-email')?.readOnly })));
  }
  await page.focus('loc=role:button[name="lunes, 26 de octubre"]'); await page.keyboard.press('Enter');
  await page.focus('loc=role:button[name="+ Nuevo evento"]'); await page.keyboard.press('Enter');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
