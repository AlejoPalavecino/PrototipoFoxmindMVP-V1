const task=await taskSpace(7);const page=task.page('p1');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
const observations=[];
await page.selectOption('loc=css:#asset-filter','covers');
observations.push(await page.evaluate(()=>({filter:'covers',cards:document.querySelectorAll('.asset-card').length,icons:document.querySelectorAll('#icon-grid a').length})));
await page.selectOption('loc=css:#asset-filter','all');
for(const width of [1440,390,320]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 observations.push(await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src'))}}));
}
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await page.evaluate(()=>document.querySelector('#icon-grid').scrollIntoView({block:'start'}));
await page.screenshot({path:base+'checks/browser-20261025/icons-final.png'});
await page.evaluate(()=>scrollTo(0,0));
await page.screenshot({path:base+'checks/browser-20261025/catalog-final.png'});
const fs=await import('node:fs/promises');
await fs.writeFile(base+'checks/browser-20261025/catalog-results.json',JSON.stringify({observations},null,2)+'\n');
console.log(observations);
await task.finish({keep:['p1']});
