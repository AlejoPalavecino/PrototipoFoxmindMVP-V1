const t=await taskSpace(1),p=t.page('p1');
await p.reload();
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/after-month-ego.png'}));
console.log(await p.snapshot());
