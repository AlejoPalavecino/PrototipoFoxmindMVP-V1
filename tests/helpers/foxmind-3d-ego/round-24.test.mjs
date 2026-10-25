import { exportScreenPage } from './export-page.test.mjs';
if (typeof taskSpace === 'function') {
  const task = await taskSpace(9), page = task.page('p1');
  const proof = async name => console.log('COLLECTION_FILTER', name, await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.fm3-classroom-card h3')].map(x => x.innerText),
    counts: [...document.querySelectorAll('[aria-label="Filtrar aulas"] button')].map(x => ({ name: x.innerText, pressed: x.getAttribute('aria-pressed') })),
    empty: document.querySelector('.p5-empty')?.textContent,
  })));
  await page.focus('loc=role:button[name="Donde estudio · 1"]'); await page.keyboard.press('Enter'); await proof('study');
  await page.focus('loc=role:button[name="Donde enseño · 1"]'); await page.keyboard.press('Enter'); await proof('teach');
  await page.fill('input[type="search"]', 'no-match-unique'); await proof('no-matches');
  await page.fill('input[type="search"]', '');
  await page.focus('loc=role:button[name="Todas · 2"]'); await page.keyboard.press('Enter'); await proof('all');
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  for (const width of [1440, 768, 390, 320]) await exportScreenPage(page, 'mis-aulas-decoded', width);
  console.log(await page.snapshot({ scope: 'full_page' }));
}
