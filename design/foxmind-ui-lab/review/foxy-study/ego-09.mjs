const t=await taskSpace(1),p=t.page('p1');
await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/foxy-study/ego-folder-wizard.png'});
await p.click('@342',{label:'Cerrar el asistente sin cambios'});
await p.click('loc=css:[data-folder="0"]',{label:'Volver a la carpeta de fotografía'});
await p.reload();
await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/foxy-study/ego-student-final.png'});
console.log(await p.snapshot());
