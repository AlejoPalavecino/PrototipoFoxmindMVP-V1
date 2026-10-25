const task=await taskSpace(7);const page=task.page('p1');
await page.reload();
const results=[];
for(const width of [1440,390,320]){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 const r=await page.evaluate(async()=>{
  const out=[];
  for(const s of window.FOX_REVIEW.screens){
   location.hash=s.id+'/'+s.variants[0]+'/normal';
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
   out.push({id:s.id,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),heading:document.querySelector('#canvas h1')?.textContent||null});
  }
  return out;
 });results.push(...r);
}
const fs=await import('node:fs/promises');
const report={date:'2026-10-25',spaceId:7,mode:'local static design atlas',renders:results.length,overflow:results.filter(r=>r.scrollWidth>r.width),broken:results.filter(r=>r.broken.length),missingHeading:results.filter(r=>!r.heading),results};
await fs.writeFile('C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/checks/browser-20261025/browser-results.json',JSON.stringify(report,null,2)+'\n');
console.log({renders:report.renders,overflow:report.overflow,broken:report.broken,missingHeading:report.missingHeading});
await page.goto('file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/review/screens.html#HOME-01/study/normal');
console.log(await page.snapshot());
