if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  const exportPage = async name => {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 15, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-${name}-1440-screen-export.test.pdf`, Buffer.from(result.data, 'base64'));
    console.log('SCREEN_EXPORT', name, await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth })));
  };
  await exportPage('mis-aulas');
  await page.goto('http://127.0.0.1:59814/agenda'); await page.waitForSelector('[aria-label="Calendario mensual"]');
  await exportPage('agenda');
  await page.focus('loc=role:button[name="lunes, 26 de octubre"]'); await page.keyboard.press('Enter');
  await page.focus('loc=role:button[name="+ Nuevo evento"]'); await page.keyboard.press('Enter');
  await page.fill('input[name="title"]', 'Evento futuro de lectura');
  console.log('EVENT_FORM_DATE', await page.evaluate(() => document.querySelector('input[name="startDate"]')?.value));
  console.log(await page.snapshot({ scope: 'full_page' }));
}
