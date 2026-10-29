const task=await taskSpace(35),page=task.page('p2');
const fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind/docs/work-log/evidence/2026-10-28-inicio-reference';
const observations=[];
for(const width of [1440,768,390,320]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await page.goto('http://127.0.0.1:53191/inicio?mode=mixed&fixture=true');
  await page.waitForSelector('.fm-home--reference');
  const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    clipped:[...document.querySelectorAll('.fm-home button,.fm-home h1,.fm-home h2,.fm-home h3')]
      .filter(node=>node.getBoundingClientRect().width&&node.scrollWidth>node.clientWidth+2).map(node=>node.textContent.trim()),
    targets:[...document.querySelectorAll('button,a,summary')].filter(node=>node.getBoundingClientRect().width&&getComputedStyle(node).visibility!=='hidden')
      .map(node=>({text:node.textContent.trim().slice(0,45),w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height}))
      .filter(rect=>rect.w<44||rect.h<44),
    images:[...document.images].filter(node=>!node.complete||!node.naturalWidth).map(node=>node.currentSrc)}));
  observations.push(state);
  console.log(await page.screenshot({path:`${dir}/mixed-${width}.png`}));
}
await fs.writeFile(`${dir}/responsive-observations.json`,JSON.stringify(observations,null,2));
console.log(observations);
console.log(await page.snapshot());
