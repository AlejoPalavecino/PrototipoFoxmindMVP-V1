const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
for(const [route,slug,ready]of [['/mis-aulas','classes','Elegí un aula'],['/mis-aulas?aula=86a39431-32c2-4f7f-8f1e-8decb768a8b5','plan','Plan de estudio'],['/agenda','agenda','Noviembre'],['/inicio','home','Mi agenda']]){
 await p.goto('http://127.0.0.1:3000'+route);
 await p.waitForFunction(s=>document.body.innerText.includes(s),ready,{timeout:10000});
 await fs.writeFile(dir+`/student-mobile-${slug}.txt`,await p.snapshot({scope:'full_page'}));
 await p.screenshot({path:dir+`/before-mobile-${slug}.png`});
 console.log({screen:slug,metrics:await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,headings:[...document.querySelectorAll('h1,h2')].map(x=>({text:x.textContent,y:Math.round(x.getBoundingClientRect().top)}))}))});
}
await p.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
