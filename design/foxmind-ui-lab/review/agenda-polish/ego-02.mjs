const t=await taskSpace(1),p=t.page('p1');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/before-month.png'}));
await p.click('@18',{label:'Revisar creación de eventos'});
console.log(await p.snapshot());
