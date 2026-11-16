const t=await taskSpace(5),p=t.page('p1');
await p.click('@338');
await p.waitForSelector('textarea');
console.log(await p.snapshot({scope:'full_page'}));
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/before-study-workspace.png'}));
