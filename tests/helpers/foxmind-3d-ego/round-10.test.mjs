if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  await page.goto('http://127.0.0.1:59814/mis-aulas?aula=845b9c1f-5849-430f-889d-2c631e82bbf3');
  await page.waitForSelector('#classroom-section-title');
  await page.waitForFunction(() => document.body.innerText.includes('Lectura contextual'));
  for (const width of [1440, 390]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: width / 96, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-plan-${width}-screen-export.test.pdf`, Buffer.from(result.data, 'base64'));
    console.log('PLAN_EXPORT', width, await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth })));
  }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
