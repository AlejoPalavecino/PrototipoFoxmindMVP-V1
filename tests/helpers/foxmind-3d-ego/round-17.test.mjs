if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), fs = await import('node:fs/promises');
  await page.fill('@605', 'Relaciones en un ecosistema escolar');
  await page.fill('@608', 'Describe una relación alimentaria entre dos organismos de un ambiente cercano.');
  await page.fill('@609', 'Explica el papel de las plantas como productores en ese ambiente.');
  await page.fill('@610', 'Relaciona un cambio ambiental con sus posibles efectos sobre los organismos.');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.cdp('Emulation.setEmulatedMedia', { media: 'screen' });
  const result = await page.cdp('Page.printToPDF', { printBackground: true, paperWidth: 390 / 96, paperHeight: 1000 / 96,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, preferCSSPageSize: false }, { timeout: 10000 });
  await fs.writeFile('C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-group3-ai-review-390.test.pdf', Buffer.from(result.data, 'base64'));
  await page.focus('loc=role:button[name="Usar propuesta revisada como borrador"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('input')].some(x => x.value === 'Relaciones en un ecosistema escolar'), undefined, { timeout: 10000 });
  const response = await page.fetch('/api/v1/classrooms/99a28785-900b-4ade-b168-4f7b0cf06406/activities');
  const activity = JSON.parse(response.body).activities?.find(x => x.title === 'Relaciones en un ecosistema escolar');
  console.log('CONTROLLED_AI_APPLIED_API_PROOF', { status: response.status, activityId: activity?.id, title: activity?.title, publicationStatus: activity?.status, type: activity?.type });
  console.log(await page.snapshot({ scope: 'full_page' }));
}
