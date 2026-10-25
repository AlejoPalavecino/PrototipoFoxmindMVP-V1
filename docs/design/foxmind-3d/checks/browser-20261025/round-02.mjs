const task=await taskSpace(7);const page=task.page('p1');
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
await page.screenshot({path:'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/checks/browser-20261025/home-desktop.png'});
console.log(await page.evaluate(()=>({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src'))})));
