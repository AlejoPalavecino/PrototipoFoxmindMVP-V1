const t=await taskSpace(1),p=t.page('p1');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/ego-form-settled.png'}));
console.log(await p.snapshot());
