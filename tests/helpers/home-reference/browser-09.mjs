const task=await taskSpace(35),page=task.page('p2');
console.log(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
  image:document.querySelector('.fm-home-greeting img')?.getAttribute('class')})));
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1784,height:882,deviceScaleFactor:1,mobile:false});
await page.goto('http://127.0.0.1:53191/inicio?mode=mixed&fixture=true');
await page.waitForSelector('.fm-home--reference');
await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
await page.waitForFunction(()=>document.getAnimations().every(animation=>animation.playState!=='running'||animation.effect.getComputedTiming().endTime===Infinity));
console.log(await page.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind/docs/work-log/evidence/2026-10-28-inicio-reference/accepted-mixed-1784.png'}));
console.log(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
  mask:getComputedStyle(document.querySelector('.fm-home-greeting img')).maskImage})));
