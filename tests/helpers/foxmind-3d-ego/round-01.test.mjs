if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.click('loc=role:button[name="Iniciar sesión"]');
  await page.waitForURL('http://127.0.0.1:63949/inicio');
  await page.waitForFunction(() => Boolean(document.querySelector('.fm-home-columns')), undefined, { timeout: 15000 });
  console.log('HOME_API', await page.fetch('/api/v1/home?timeZone=UTC'));
  console.log('HOME_GEOMETRY', await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
    images: [...document.images].map(image => ({ src: new URL(image.currentSrc).pathname, loaded: image.complete && image.naturalWidth > 0 })) })));
  try {
    console.log('HOME_CAPTURE', await page.screenshot({ path: 'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/.test-artifacts/foxmind-3d-home-1440.test.png' }));
  } catch (error) { console.log('HOME_CAPTURE_UNAVAILABLE', error.message); }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
