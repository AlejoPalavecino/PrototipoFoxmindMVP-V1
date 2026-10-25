if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.fill('input[name="title"]', 'Lectura escolar sintética');
  await page.fill('input[name="startDate"]', '2026-10-26');
  await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
  const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 390 / 96, paperHeight: 1000 / 96,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
  await fs.writeFile('C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-agenda-form-390-screen-export.test.pdf', Buffer.from(result.data, 'base64'));
  await page.focus('loc=role:button[name="Crear evento"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('input[name="title"]'), undefined, { timeout: 10000 });
  console.log('AGENDA_EVENT_SAVED');
  await page.goto('http://127.0.0.1:59814/inicio'); await page.waitForSelector('.fm-home-columns');
  console.log('HOME_MINIAGENDA', await page.evaluate(() => [...document.querySelectorAll('section[aria-label]')]
    .filter(x => x.getAttribute('aria-label') === 'Tu miniagenda').map(x => x.innerText)));
  console.log(await page.snapshot({ scope: 'full_page' }));
}
