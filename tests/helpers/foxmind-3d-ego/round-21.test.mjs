if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises'), origin = 'http://127.0.0.1:49657';
  await page.focus('loc=role:button[name="Mis Aulas / Guardar y salir"]'); await page.keyboard.press('Enter');
  for (const role of ['teacher', 'empty', 'archived', 'unverified']) {
    await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
    await page.fill('input[name="email"]', `${role}-3d@example.test`);
    await page.fill('input[name="password"]', 'Integration private files password 😀');
    await page.focus('input[name="password"]'); await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/${role === 'unverified' ? 'verify-email' : 'inicio'}`);
    if (role === 'unverified') {
      console.log('UNVERIFIED_GATE', await page.evaluate(() => ({ url: location.pathname, homeRows: document.querySelectorAll('.fm-home-columns').length })));
      continue;
    }
    await page.waitForSelector('.fm-home-columns');
    const h = await page.fetch('/api/v1/home?timeZone=UTC'), data = JSON.parse(h.body);
    console.log('HOME_VARIANT_PROOF', { role, status: h.status, participation: data.participation, memberships: data.memberships,
      privateTeacherReview: data.modules?.review.status, classroomCount: data.modules?.classrooms.totalItems });
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
    const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 390 / 96, paperHeight: 1000 / 96,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
    await fs.writeFile(`C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-group3-${role}-home-390.test.pdf`, Buffer.from(result.data, 'base64'));
  }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
