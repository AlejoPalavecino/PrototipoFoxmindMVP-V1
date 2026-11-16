const t=await taskSpace(1),p=t.page('p1');
await p.click("loc=role:button[name='Crear evento']",{label:'Abrir creación de evento'});
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/ego-new-form.png'}));
console.log(await p.snapshot());
