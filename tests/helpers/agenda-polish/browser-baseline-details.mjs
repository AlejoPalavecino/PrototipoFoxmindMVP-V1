const task = await taskSpace(6), page = task.page('p1');
const fs = await import('node:fs/promises');
const evidence = 'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-25-agenda-polish';
await page.click('loc=role:button[name="Cancelar"]');
const styles = await page.evaluate(() => [...document.querySelectorAll('.fm3d-sidebar a')].map(el => ({ text: el.textContent.trim(), color: getComputedStyle(el).color, fontSize: getComputedStyle(el).fontSize, fontWeight: getComputedStyle(el).fontWeight, background: getComputedStyle(el).backgroundColor })));
await fs.writeFile(evidence + '/baseline-navbar.json', JSON.stringify(styles, null, 2));
console.log(styles);
console.log(await page.snapshot());
