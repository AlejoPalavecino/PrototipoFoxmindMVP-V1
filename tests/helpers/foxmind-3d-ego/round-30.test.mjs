import { exportScreenPage } from './export-page.test.mjs';
if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1'), origin = new URL(import.meta.url).searchParams.get('origin');
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.cdp('Emulation.setTimezoneOverride', { timezoneId: 'Etc/GMT+12' });
  await page.goto(`${origin}/inicio`); await page.waitForSelector('.fm-home-columns');
  const extreme = await page.evaluate(async () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const r = await fetch(`/api/v1/home?timeZone=${encodeURIComponent(zone)}`), data = await r.json();
    return { zone, item: data.modules.agenda.items.find(x => x.title === 'Lectura en zona extrema') };
  });
  console.log('REAL_EXTREME_HOME', extreme);
  if (extreme.zone !== 'Etc/GMT+12' || extreme.item?.target.date !== '2026-10-25') throw new Error('Extreme fixture target date mismatch');
  await exportScreenPage(page, 'home', 1440, 1000, 'group5');
  await exportScreenPage(page, 'home', 390, 1000, 'group5');
  await page.focus('button[aria-label$="Lectura en zona extrema"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.pathname === '/agenda' && new URLSearchParams(location.search).get('date') === '2026-10-25');
  await page.waitForSelector('[data-event-id="9b5b8e31-e5a1-4668-b63d-011bf992088a"]');
  console.log('REAL_EXTREME_AGENDA', await page.evaluate(() => ({ path: location.pathname, query: location.search,
    selected: document.querySelector('.agenda-days [aria-pressed="true"]')?.getAttribute('aria-label'),
    focus: document.activeElement?.getAttribute('data-event-id'), event: document.querySelector('[data-event-id="9b5b8e31-e5a1-4668-b63d-011bf992088a"]')?.innerText })));
  await exportScreenPage(page, 'agenda', 1440, 1000, 'group5');
  await exportScreenPage(page, 'agenda', 390, 1000, 'group5');
  for (const [path, selector] of [['profile', 'input[name="firstName"]'], ['settings', 'input[name="currentPassword"]'], ['mis-aulas', 'input[type="search"]']]) {
    await page.goto(`${origin}/${path}`); await page.waitForSelector(selector);
    if (path === 'mis-aulas') await page.waitForFunction(() => document.querySelectorAll('.fm3-classroom-card').length === 2);
    await exportScreenPage(page, path, 1440, 1000, 'group5');
    await exportScreenPage(page, path, path === 'profile' ? 320 : 390, 1000, 'group5');
    if (path === 'mis-aulas') console.log('SEARCH_LAYOUT', await page.evaluate(() => {
      const input = document.querySelector('input[type="search"]'), label = input.closest('label');
      const rect = el => { const r = el?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; };
      return { input: rect(input), label: rect(label), overflow: document.documentElement.scrollWidth > innerWidth };
    }));
  }
  console.log(await page.snapshot({ scope: 'full_page' }));
}
