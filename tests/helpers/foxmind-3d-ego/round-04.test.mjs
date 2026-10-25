if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.goto('http://127.0.0.1:59814/sign-in');
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.click('loc=role:button[name="Iniciar sesión"]');
  await page.waitForURL('http://127.0.0.1:59814/inicio');
  await page.waitForSelector('.fm-home-columns');
  await page.keyboard.press('Control+0');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
  try {
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 1440 / 96, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    const fs = await import('node:fs/promises');
    await fs.writeFile('C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-home-screen-export.test.pdf', Buffer.from(result.data, 'base64'));
    console.log('SCREEN_MEDIA_EXPORT_PDF_SAVED');
  } catch (error) { console.log('SCREEN_MEDIA_EXPORT_UNAVAILABLE', error.message); }
  console.log('HOME1440', await page.evaluate(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth,
    imagesLoaded: [...document.images].every(i => i.complete && i.naturalWidth > 0) })));
  console.log(await page.snapshot({ scope: 'full_page' }));
}
