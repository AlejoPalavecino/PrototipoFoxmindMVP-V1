const fs = await import('node:fs/promises');
const out = 'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-26-auth-responsive';
await fs.mkdir(out, { recursive: true });
const task = await taskSpace('qa-auth-responsive');
console.log({spaceId:task.spaceId});
const page = task.page('p1');
await page.cdp('Emulation.setDeviceMetricsOverride', {width:1366,height:768,deviceScaleFactor:1,mobile:false});
const results=[];
for(const route of ['sign-in','register']) {
 await page.goto('http://localhost:52171/'+route+'?next=%2Fmis-aulas');
 await page.evaluate(async()=>{await document.fonts.ready;});
 await page.waitForFunction(()=>document.querySelector('h1')&&[...document.images].every(i=>i.complete));
 console.log(await page.snapshot());
 const data=await page.evaluate(()=>{
  const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,font:s.fontSize,lineHeight:s.lineHeight,display:s.display,text:e.textContent?.trim().slice(0,100)};};
  return {url:location.pathname,viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],font:document.fonts.check('700 32px "Fredoka Auth"'),heading:box(document.querySelector('h1')),story:box(document.querySelector('.auth-story')),copy:box(document.querySelector('.auth-story-copy')),surface:box(document.querySelector('.surface')),inputs:[...document.querySelectorAll('input')].map(box),cta:box(document.querySelector('.button-primary')),targets:[...document.querySelectorAll('button')].map(box)};
 });
 await page.screenshot({path:out+'/baseline-'+route+'-1366x768.png'});
 results.push(data);console.log(data);
}
await fs.writeFile(out+'/baseline.json',JSON.stringify(results,null,2));
