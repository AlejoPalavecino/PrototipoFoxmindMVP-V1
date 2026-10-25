const task=await taskSpace(8),page=task.page('p1');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
await page.cdp('Page.bringToFront',{});
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
await page.reload();
await page.selectOption('loc=css:#asset-filter','brand');
console.log(await page.info());
await page.screenshot({path:base+'checks/original-logo-20261025/catalog-brand.png',clip:{x:0,y:560,width:1440,height:1000}});
console.log('catalog capture saved');
