const task=await taskSpace('FoxMind original logo 2026-10-25');
const page=task.page('p1');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
await page.goto('file:///'+base+'review/index.html');
console.log({spaceId:task.spaceId,page:page.label});
console.log(await page.snapshot());
