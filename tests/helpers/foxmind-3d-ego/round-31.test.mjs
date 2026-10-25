import { exportScreenPage } from './export-page.test.mjs';
if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  await exportScreenPage(page, 'mis-aulas-decoded', 1440, 1000, 'group5');
  await exportScreenPage(page, 'mis-aulas-decoded', 768, 1000, 'group5');
  await exportScreenPage(page, 'mis-aulas-decoded', 320, 1000, 'group5');
  await page.focus('.fm3-classroom-card:first-child button'); await page.keyboard.press('Enter');
  await page.waitForSelector('#classroom-section-title');
  await page.waitForFunction(() => document.body.innerText.includes('Lectura contextual'));
  const context = async name => console.log('REAL_PLAN_HEADER_CONTEXT', name, await page.evaluate(() => {
    const box = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { title: document.querySelector('.fm3-room-heading h1')?.innerText,
      context: document.querySelector('.fm3-room-context')?.innerText, role: document.querySelector('.fm3-room-heading .fm3-membership')?.innerText,
      header: box('.fm3-room-header'), heading: box('.fm3-room-heading'), illustration: box('.p5-room-cover'),
      overflow: document.documentElement.scrollWidth > innerWidth };
  }));
  await context('from-All-study');
  await exportScreenPage(page, 'plan-from-all', 1440, 1000, 'group5');
  await exportScreenPage(page, 'plan-from-all', 390, 1000, 'group5');
  await page.focus('.fm3d-shell-nav a[href="/inicio"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('.fm-home-columns');
  await page.focus('button[aria-label="Entrar al aula: Biología · preguntas sobre la vida"]'); await page.keyboard.press('Enter');
  await page.waitForSelector('#classroom-section-title');
  await page.waitForFunction(() => document.body.innerText.includes('Lectura contextual'));
  await context('from-Home-teach');
  await exportScreenPage(page, 'plan-from-home', 1440, 1000, 'group5');
  await exportScreenPage(page, 'plan-from-home', 320, 1000, 'group5');
  console.log(await page.snapshot({ scope: 'full_page' }));
}
