const t=await taskSpace(1),p=t.page('p1');
await p.click('@133');
await p.reload();
console.log(await p.evaluate(()=>({url:location.href,title:document.querySelector('h1').textContent,overflow:document.documentElement.scrollWidth>innerWidth,dialogOpen:document.querySelector('dialog').open,cards:document.querySelectorAll('.class-card').length})));
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/classrooms/final-teacher-ego.png'}));
