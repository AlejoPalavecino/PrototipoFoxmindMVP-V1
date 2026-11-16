const t=await taskSpace(1),p=t.page('p1');
await p.click('@25',{label:'Revisar alineación de contadores'});
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/participation-polish/ego-before-badges.png'}));
