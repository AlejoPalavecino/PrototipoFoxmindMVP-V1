const task=await taskSpace(7);const page=task.page('p1');await page.reload();
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
const observations=[];
await page.selectOption('loc=css:#asset-filter','covers');
observations.push(await page.evaluate(()=>({filter:'covers',cards:document.querySelectorAll('.asset-card').length,icons:document.querySelectorAll('#icon-grid a').length})));
await page.selectOption('loc=css:#asset-filter','all');
await page.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
await page.waitForFunction(()=>[...document.images].every(i=>i.complete),undefined,{timeout:5000});
for(const width of [1440,390,320]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 observations.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src'))})));
}
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await page.evaluate(()=>document.querySelector('#icon-grid').scrollIntoView({block:'start'}));
await page.screenshot({path:base+'checks/browser-20261025/icons-final.png'});
await page.evaluate(()=>scrollTo(0,0));
await page.screenshot({path:base+'checks/browser-20261025/catalog-final.png'});
const fs=await import('node:fs/promises');
await fs.writeFile(base+'checks/browser-20261025/catalog-results.json',JSON.stringify({scope:'Local catalogue; lazy images eagerly loaded only for this inspection',observations},null,2)+'\n');
console.log(observations);
await task.finish({keep:['p1']});
