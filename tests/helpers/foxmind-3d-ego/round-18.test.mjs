if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  const origin = 'http://127.0.0.1:49657';
  await page.goto(`${origin}/profile`); await page.waitForSelector('input[name="firstName"]');
  await page.fill('input[name="firstName"]', 'Cuenta escolar');
  await page.focus('loc=role:button[name="Guardar cambios"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.body.innerText.includes('Guardaste los cambios de tu perfil.'));
  await page.reload(); await page.waitForSelector('input[name="firstName"]');
  console.log('PROFILE_RELOAD_PROOF', await page.evaluate(() => ({ firstName: document.querySelector('input[name="firstName"]')?.value,
    readonlyEmail: document.querySelector('#profile-email')?.readOnly, passwordFields: document.querySelectorAll('input[type="password"]').length })));
  for (const [path, ready] of [['profile', 'input[name="firstName"]'], ['mis-aulas', '[aria-label="Donde estudio"]']]) {
    if (path !== 'profile') { await page.goto(`${origin}/${path}`); await page.waitForSelector(ready); }
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 15, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-group3-${path}-1440.test.pdf`, Buffer.from(result.data, 'base64'));
  }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
