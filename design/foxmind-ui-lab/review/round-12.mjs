const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
for(const [name,slug] of [['Muro','wall'],['Biblioteca','library'],['Actividades','activities'],['Progreso','progress'],['Alumnos','members'],['Historial','history'],['Configuración','settings']]){
 await p.click(`loc=role:button[name="${name}"]`);
 const snap=await p.snapshot({scope:'full_page'});
 await fs.writeFile(`${dir}/teacher-${slug}.txt`,snap);
 await p.screenshot({path:`${dir}/before-teacher-${slug}.png`});
 console.log({screen:name,body:await p.evaluate(()=>document.querySelector('main')?.innerText.slice(-2600)),height:await p.evaluate(()=>document.documentElement.scrollHeight)});
}
await p.click('loc=href:/foxy-ai');
console.log(await p.snapshot({scope:'full_page'}));
