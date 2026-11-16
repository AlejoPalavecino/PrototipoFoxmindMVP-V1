const t=await taskSpace(1),p=t.page('p1');
await p.click('@125',{label:'Leer propuesta y criterios'});
console.log(await p.snapshot());
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/participation-polish/ego-ai-review.png'}));
