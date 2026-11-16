const t=await taskSpace(1),p=t.page('p1');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/participation-polish/ego-after-badges.png'}));
await p.click('@59',{label:'Abrir creación de actividad'});
console.log(await p.snapshot());
