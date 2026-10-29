const task=await taskSpace(35),page=task.page('p2');
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1784,height:882,deviceScaleFactor:1,mobile:false});
await page.waitForFunction(()=>innerWidth===1784);
const dir='C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind/docs/work-log/evidence/2026-10-28-inicio-reference';
console.log({viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}))});
console.log(await page.screenshot({path:`${dir}/mixed-1784.png`}));
