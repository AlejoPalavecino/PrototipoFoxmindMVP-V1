const t=await taskSpace(5),p=t.page('p1');
console.log(await p.snapshot({scope:'full_page'}));
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/before-teacher-plan.png'}));
