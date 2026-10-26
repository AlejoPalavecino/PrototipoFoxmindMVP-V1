const task = await taskSpace('qa-home-polish');
const page = task.page('p1');
await page.goto('http://127.0.0.1:53271/?mode=teach');
await page.waitForSelector('h1', { state: 'visible' });
console.log({ spaceId: task.spaceId, page: page.label });
console.log(await page.snapshot());
