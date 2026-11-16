const t=await taskSpace(1),p=t.page('p1');
await p.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?account=16#docente/avisos');
console.log(await p.snapshot());
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/account-notifications/ego-teacher-inbox.png'});
