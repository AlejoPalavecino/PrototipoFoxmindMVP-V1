const t=await taskSpace(1),p=t.page('p1');
await p.goto('http://127.0.0.1:4173/?iteration=2-after#docente/agenda');
console.log(await p.evaluate(()=>({heading:document.querySelector('h1')?.textContent,days:document.querySelectorAll('.calendar-day').length,events:document.querySelectorAll('.cell-event').length,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/iteration-2/after-agenda-ego.png'});
await p.goto('http://127.0.0.1:4173/?iteration=2-after#docente/inicio');
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/iteration-2/after-home-ego.png'});
console.log(await p.snapshot({scope:'full_page'}));
