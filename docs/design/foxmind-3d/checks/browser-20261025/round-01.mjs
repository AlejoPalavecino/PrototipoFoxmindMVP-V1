const task=await taskSpace('FoxMind 3D design handoff 2026-10-25');
const page=task.page('p1');
await page.goto('file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/review/screens.html#HOME-01/study/normal');
console.log({spaceId:task.spaceId,page:page.label});
console.log(await page.snapshot());
