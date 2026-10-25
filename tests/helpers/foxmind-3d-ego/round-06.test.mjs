if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  const base = 'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/';
  for (const width of [320, 390, 768]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    console.log('HOME_WIDTH', await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })));
    const shot = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: width / 96, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`${base}foxmind-3d-home-${width}-screen-export.test.pdf`, Buffer.from(shot.data, 'base64'));
  }
  await page.goto('http://127.0.0.1:59814/agenda');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
