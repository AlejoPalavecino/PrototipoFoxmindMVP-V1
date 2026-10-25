export async function exportScreenPage(page, name, width, height = 1000, group = 'group4') {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
  await page.waitForFunction(() => [...document.images].filter(i => i.loading !== 'lazy').every(i => i.complete && i.naturalWidth > 0));
  const before = await page.evaluate(async () => {
    await Promise.all([...document.images].filter(i => i.complete && i.naturalWidth > 0).map(i => i.decode().catch(() => {})));
    return { url: location.pathname, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
      images: [...document.images].map(i => ({ path: new URL(i.currentSrc || i.src, location.href).pathname, complete: i.complete, naturalWidth: i.naturalWidth })),
      vitals: window.__foxmindQaVitals ?? null,
      resources: performance.getEntriesByType('resource').filter(e => /foxmind-3d|\/api\/v1\/home/.test(e.name)).map(e => ({ path: new URL(e.name).pathname, encodedBodySize: e.encodedBodySize })) };
  });
  console.log('LIVE_SCREEN_EXPORT_STATE', name, before);
  const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: width / 96, paperHeight: height / 96,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
  const fs = await import('node:fs/promises');
  const path = `C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-${group}-${name}-${width}.test.pdf`;
  await fs.writeFile(path, Buffer.from(result.data, 'base64')); console.log('LIVE_SCREEN_EXPORT_SAVED', path);
}
