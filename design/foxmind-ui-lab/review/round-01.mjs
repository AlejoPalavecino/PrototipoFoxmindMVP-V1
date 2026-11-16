const task = await taskSpace('FoxMind · auditoría y maqueta UI');
const page = task.page('p1');
console.log({ taskSpaceId: task.spaceId, page: page.label });
console.log(await page.snapshot());
