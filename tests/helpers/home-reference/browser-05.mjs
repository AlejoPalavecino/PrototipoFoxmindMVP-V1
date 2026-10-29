const task=await taskSpace(35),page=task.page('p2');
console.log(await page.snapshot());
await import('./browser-04.mjs');
