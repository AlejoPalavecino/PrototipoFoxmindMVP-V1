import { exportScreenPage } from './export-page.test.mjs';
if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = 'http://127.0.0.1:51264';
  await page.goto(`${origin}/sign-in`); await page.keyboard.press('Control+0');
  await page.fill('input[name="email"]', 'mixed-3d@example.test');
  await page.fill('input[name="password"]', 'Integration private files password 😀');
  await page.focus('input[name="password"]'); await page.keyboard.press('Enter'); await page.waitForURL(`${origin}/inicio`);
  await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__foxmindQaVitals={lcp:null,cls:0,inp:null};
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__foxmindQaVitals.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__foxmindQaVitals.cls+=e.value}).observe({type:'layout-shift',buffered:true});}catch{}` });
  await page.goto(`${origin}/inicio`); await page.waitForSelector('.fm-home-columns');
  await exportScreenPage(page, 'home', 1440); await exportScreenPage(page, 'home', 390);
  for (const [path, ready] of [['profile', 'input[name="firstName"]'], ['settings', 'input[name="currentPassword"]'], ['mis-aulas', '[aria-label="Filtrar aulas"]']]) {
    await page.goto(`${origin}/${path}`);
    if (path === 'mis-aulas') await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Todas ·')));
    else await page.waitForSelector(ready);
    await exportScreenPage(page, path, 1440);
    if (path !== 'mis-aulas') await exportScreenPage(page, path, path === 'profile' ? 320 : 390);
  }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
