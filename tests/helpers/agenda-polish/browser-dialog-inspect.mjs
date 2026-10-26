const task = await taskSpace(6), page = task.page('p1');
await page.click('loc=role:button[name="Editar evento"]');
await page.waitForSelector('[role="dialog"]', { state: 'visible' });
console.log(await page.snapshot({ scope: 'full_page' }));
