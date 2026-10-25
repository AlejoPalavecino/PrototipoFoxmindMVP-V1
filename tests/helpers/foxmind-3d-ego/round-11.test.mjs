if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
  const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 390 / 96, paperHeight: 1000 / 96,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
  await fs.writeFile('C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-submit-confirm-390-screen-export.test.pdf', Buffer.from(result.data, 'base64'));
  await page.focus('loc=role:button[name="Confirmar envío del trabajo"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('Entrega confirmada'), undefined, { timeout: 10000 });
  console.log(await page.snapshot({ scope: 'full_page' }));
}
