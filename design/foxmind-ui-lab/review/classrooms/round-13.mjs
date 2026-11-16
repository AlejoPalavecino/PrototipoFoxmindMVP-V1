const t=await taskSpace(1),p=t.page('p1');
await p.fill('@115','Mirar con atención');
await p.click('@131');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/classrooms/review-ego.png'}));
console.log(await p.snapshot({scope:'subtree',root:'@51'}));
