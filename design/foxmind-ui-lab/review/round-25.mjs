const t=await taskSpace(5),p=t.page('p1');
await p.goto('http://127.0.0.1:4173');
await p.click('loc=role:button[name="Crear actividad"]');
console.log(await p.snapshot({scope:'full_page'}));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/after-select-class.png'});
await p.click('loc=role:button[name="Continuar"]');
console.log(await p.snapshot({scope:'full_page'}));
