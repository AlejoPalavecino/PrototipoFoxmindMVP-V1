const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=css:[data-action="home-queries"]');
console.log({queries:await p.evaluate(()=>document.querySelector('.home-review-list').textContent)});
await p.click('loc=css:[data-action="home-query"]');
await p.waitForURL('**#docente/aula/muro');
console.log({queryDestination:await p.url()});
await p.goto('http://127.0.0.1:4173/?v=3#estudiante/inicio');
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/home-polish/ego-student.png'});
console.log(await p.snapshot({scope:'full_page'}));
