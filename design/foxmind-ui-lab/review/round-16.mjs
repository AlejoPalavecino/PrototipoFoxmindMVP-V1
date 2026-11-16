const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
await p.waitForFunction(()=>!document.body.innerText.includes('Cargando tus actividades'));
await fs.writeFile(dir+'/student-home.txt',await p.snapshot({scope:'full_page'}));
await p.screenshot({path:dir+'/before-student-home-ready.png'});
await p.click('loc=href:/carpetas-de-estudio');
await p.waitForFunction(()=>!document.body.innerText.includes('Cargando carpetas'));
console.log(await p.snapshot({scope:'full_page'}));
await p.screenshot({path:dir+'/before-study-folders.png'});
