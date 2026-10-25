if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  const origin = 'http://127.0.0.1:49657';
  await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter');
  await page.waitForURL(`${origin}/inicio`); await page.waitForSelector('.fm-home-columns');
  for (const width of [1440, 390, 320]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    console.log('GROUP3_HOME_METRICS', await page.evaluate(() => {
      const rect = e => { const b = e?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null; };
      return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, legacySpinner: document.body.innerText.includes('Cargando tus aulas'),
        hero: rect(document.querySelector('.fm-home-greeting')), review: rect(document.querySelector('[aria-label="Para revisar"]')),
        covers: [...document.querySelectorAll('.fm-home-row-cover img,img.fm-home-row-cover')].map(i => ({ loading: i.loading, decoding: i.decoding,
          complete: i.complete, naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight, src: i.currentSrc, bbox: rect(i) })) };
    }));
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: width / 96, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-group3-home-${width}.test.pdf`, Buffer.from(result.data, 'base64'));
  }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
