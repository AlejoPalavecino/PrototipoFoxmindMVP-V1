const t=await taskSpace(1),p=t.page('p1');
await p.goto('http://127.0.0.1:4173/?v=2#docente/agenda');
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/iteration-2/final-agenda.png'});
await p.goto('http://127.0.0.1:4173/?v=2#docente/inicio');
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/iteration-2/final-home.png'});
console.log(await p.evaluate(()=>({url:location.href,heading:document.querySelector('h1').innerText,welcome:document.querySelector('.welcome-v2 h2').innerText,overflow:document.documentElement.scrollWidth>innerWidth})));
