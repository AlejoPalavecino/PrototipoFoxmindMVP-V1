const task = await taskSpace(6), page = task.page('p1');
console.log(await page.snapshot({ scope: 'full_page' }));
