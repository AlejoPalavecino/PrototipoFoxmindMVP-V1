const task=await taskSpace(3),page=task.page('p1');
const fs=await import('node:fs/promises');
const evidence='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-25-home-polish';
await fs.mkdir(evidence,{recursive:true});
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
await page.evaluate(()=>document.fonts.ready.then(()=>true));
console.log(await page.screenshot({path:evidence+'/baseline-teach-1536.png'}));
console.log(await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,hero:document.querySelector('.fm-home-greeting')?.getBoundingClientRect().toJSON(),agenda:document.querySelector('.fm-home-module--agenda')?.getBoundingClientRect().toJSON(),font:getComputedStyle(document.querySelector('h1')).fontFamily})));
