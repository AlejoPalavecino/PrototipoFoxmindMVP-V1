const task=await taskSpace(7);const page=task.page('p1');
const fs=await import('node:fs/promises');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
const frames=JSON.parse(await fs.readFile(base+'review/screen-index.json','utf8'));
await fs.copyFile(base+'checks/browser-20261025/browser-results.json',base+'checks/browser-20261025/browser-results-superseded.json');
const results=[];
for(const width of [1440,390,320]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 for(const s of frames){
  const hash=s.id+'/'+s.variants[0]+'/normal';
  await page.goto('file:///'+base+'review/screens.html#'+hash);
  await page.waitForFunction(expected=>document.title.startsWith(expected+' ·'),s.id,{timeout:5000});
  const r=await page.evaluate(async()=>{
   await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,renderedId:document.title.split(' ·')[0],hash:location.hash,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),heading:document.querySelector('#canvas h1')?.textContent||null};
  });results.push({id:s.id,...r});
 }
 console.log({width,rendered:results.filter(r=>r.width===width).length});
}
const report={date:'2026-10-25',revision:'canonical tokens; observed title identity after each navigation',spaceId:7,mode:'local static design atlas',renders:results.length,wrongFrame:results.filter(r=>r.id!==r.renderedId),overflow:results.filter(r=>r.scrollWidth>r.width),broken:results.filter(r=>r.broken.length),missingHeading:results.filter(r=>!r.heading),results};
await fs.writeFile(base+'checks/browser-20261025/browser-results.json',JSON.stringify(report,null,2)+'\n');
console.log({renders:report.renders,wrongFrame:report.wrongFrame,overflow:report.overflow,broken:report.broken,missingHeading:report.missingHeading});
console.log(await page.snapshot());
