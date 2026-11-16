const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
for(const [name,slug]of [['Muro','wall'],['Biblioteca','library'],['Mi progreso','progress'],['Compañeros','members'],['Actividades','activities']]){
 await p.click(`loc=role:button[name="${name}"]`);
 await fs.writeFile(dir+`/student-${slug}.txt`,await p.snapshot({scope:'full_page'}));
 await p.screenshot({path:dir+`/before-student-${slug}.png`});
 console.log({screen:name,text:await p.evaluate(()=>document.querySelector('main')?.innerText.slice(-1400))});
}
console.log(await p.snapshot({scope:'full_page'}));
