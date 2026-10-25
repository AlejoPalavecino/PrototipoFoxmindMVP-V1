if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.cdp('Network.enable'); await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  try {
    await page.cdp('Network.setBlockedURLs', { urls: ['*foxmind-3d/*.webp'] });
    await page.reload(); await page.waitForSelector('.fm-home-columns');
    console.log('REAL_IMAGES_BLOCKED', await page.evaluate(() => ({ rows: document.querySelectorAll('.fm-home-row').length,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
      title: document.querySelector('.fm-home-greeting h1')?.innerText,
      actions: [...document.querySelectorAll('.fm-home-row-action')].map(b => b.getAttribute('aria-label')),
      overflow: document.documentElement.scrollWidth > innerWidth })));
  } finally {
    await page.cdp('Network.setBlockedURLs', { urls: [] }); await page.cdp('Network.setCacheDisabled', { cacheDisabled: false });
  }
  await page.reload(); await page.waitForSelector('.fm-home-columns');
  await page.cdp('Emulation.clearDeviceMetricsOverride'); await page.keyboard.press('Control+0');
  const before = await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio }));
  for (let i = 0; i < 5; i++) await page.keyboard.press('Control+Equal');
  console.log('NATIVE_ZOOM_WITHOUT_EMULATION', { before, after: await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio,
    overflow: document.documentElement.scrollWidth > innerWidth })) });
  await page.keyboard.press('Control+0');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  console.log(await page.snapshot({ scope: 'full_page' }));
}
