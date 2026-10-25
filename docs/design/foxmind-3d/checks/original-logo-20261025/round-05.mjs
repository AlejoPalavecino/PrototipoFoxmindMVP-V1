const task=await taskSpace(8),page=task.page('p1');
const fs=await import('node:fs/promises');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
const results=[];
for(const[name,hash,width]of [['home-desktop','HOME-01/mixed/normal',1440],['auth-mobile','AUTH-01/default/normal',390],['home-compact','HOME-01/study/normal',320]]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 await page.goto('file:///'+base+'review/screens.html#'+hash);
 await page.waitForFunction(id=>document.title.startsWith(id+' ·'),hash.split('/')[0],{timeout:5000});
 if(await page.evaluate(()=>document.querySelector('#toggle-review').getAttribute('aria-expanded')==='true'))await page.click('loc=css:#toggle-review');
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0),undefined,{timeout:5000});
 results.push({case:name,requestedWidth:width,expectedId:hash.split('/')[0],...await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,renderedId:document.title.split(' ·')[0],brandSources:[...document.images].filter(i=>i.src.includes('/brand/')).map(i=>i.getAttribute('src')),broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)}))});
}
const failures=results.filter(r=>r.scrollWidth>r.width||r.broken.length||r.expectedId!==r.renderedId||r.width!==r.requestedWidth);
await fs.writeFile(base+'checks/original-logo-20261025/browser-results.json',JSON.stringify({date:'2026-10-25',spaceId:8,scope:'DOM/asset loading checks of original logo in shell/auth. Visual proof uses Sharp brand-preview.webp, not browser screenshots.',results,failures,catalogue:{brandSVGs:6,brokenImages:0,observation:'Round 03 DOM observation'},screenshots:{status:'unavailable',reason:'Page.captureScreenshot timed out in rounds 03 and 04. Round 02 produced no saved evidence and is not counted.'}},null,2)+'\n');
console.log({results,failures});
await task.finish({keep:[]});
