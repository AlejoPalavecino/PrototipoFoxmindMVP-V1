// Final stable native evidence: wait for real CSS transitions after view restoration.
const task = await taskSpace(6), page = task.page('p1');
const fs = await import('node:fs/promises');
const evidence = 'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-25-agenda-polish';
const results = [];
for (const [mode, width, height] of [['reference',1536,1024], ['populated',1536,1024], ['populated',1920,1080], ['populated',768,1024], ['populated',390,844], ['populated',320,812], ['empty',1536,1024], ['empty',390,844], ['all-day',1536,1024], ['loading',1536,1024], ['error',1536,1024]]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  await page.goto('http://127.0.0.1:53271/?mode=' + mode);
  await page.waitForSelector('.agenda-calendar', { state: 'visible' });
  if (!['loading','error'].includes(mode)) await page.waitForSelector('.agenda-selected', { state: 'visible' });
  if (mode === 'error') await page.waitForSelector('[role="alert"]', { state: 'visible' });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.mouse.move(10, 10, { label: 'leave calendar unobscured' });
  await page.waitForFunction(() => document.getAnimations().every(animation => !(animation instanceof CSSTransition) || animation.playState !== 'running'));
  const data = await page.evaluate(() => {
    const box = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
    const controls = [...document.querySelectorAll('.agenda-main button')].map(el => ({ text: el.textContent.trim(), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })).filter(el => el.width && el.height);
    const nav = [...document.querySelectorAll('.fm3d-shell-nav a')].map(el => ({ text: el.textContent.trim(), color: getComputedStyle(el).color, fontSize: getComputedStyle(el).fontSize, fontWeight: getComputedStyle(el).fontWeight, background: getComputedStyle(el).backgroundColor }));
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, cells: document.querySelectorAll('.agenda-grid > button').length, title: getComputedStyle(document.querySelector('h1')).fontFamily, body: getComputedStyle(document.querySelector('.agenda-main')).fontFamily, calendar: box('.agenda-calendar'), selected: box('.agenda-selected'), upcoming: box('.agenda-upcoming'), scene: box('.agenda-side-scene'), controls, nav, text: document.querySelector('.agenda-main').innerText };
  });
  await fs.writeFile(evidence + '/final-' + mode + '-' + width + '.snapshot.txt', await page.snapshot({ scope: 'full_page' }));
  await page.screenshot({ path: evidence + '/final-' + mode + '-' + width + '.png' });
  results.push({ mode, ...data });
}
await fs.writeFile(evidence + '/final-dimensions.json', JSON.stringify(results, null, 2));
console.log(results.map(({ mode, width, scrollWidth, clientWidth, cells, controls, body }) => ({ mode, width, overflow: scrollWidth - clientWidth, cells, body, shortControls: controls.filter(control => control.height < 43.9).length, narrowControls: controls.filter(control => control.width < 43.9).length })));
console.log(await page.snapshot());
