const t=await taskSpace(1),p=t.page('p1');
await p.click('@263',{label:'Volver al rol docente'});
await p.click('loc=css:.sidebar a.class-link[data-class="photo"]',{label:'Entrar a fotografía y luz'});
await p.click('loc=css:.room-section-nav a[href="#docente/aula/progreso"]',{label:'Ver resumen y gráficas'});
await p.reload();
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/teaching-polish/ego-final.png'}));
