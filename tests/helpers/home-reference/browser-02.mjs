const task=await taskSpace(35),page=task.page('p2');
const fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind/docs/work-log/evidence/2026-10-28-inicio-reference';
await fs.mkdir(dir,{recursive:true});
console.log(await page.screenshot({path:`${dir}/mixed-1784-initial.png`}));
console.log(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
  images:[...document.images].map(image=>({src:image.currentSrc,ok:image.complete&&image.naturalWidth>0})),
  small:[...document.querySelectorAll('button,a,summary')].filter(node=>node.getBoundingClientRect().width&&getComputedStyle(node).visibility!=='hidden')
    .map(node=>({text:node.textContent.trim().slice(0,45),w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height}))
    .filter(rect=>rect.w<44||rect.h<44)})));
