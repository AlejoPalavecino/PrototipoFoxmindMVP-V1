const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=role:button[name="Empezar El mundo de las células"]');
await p.waitForURL('**#estudiante/actividad');
console.log({activity:await p.evaluate(()=>document.querySelector('h1').textContent)});
await p.goto('http://127.0.0.1:4173/?v=4#estudiante/inicio');
await p.evaluate(()=>window.scrollTo(0,document.querySelector('.home-priorities').getBoundingClientRect().top+scrollY-65));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/widgets/ego-student-final.png'});
console.log({preview:await p.url(),heading:await p.evaluate(()=>document.querySelector('.home-priorities h2').textContent)});
