const t=await taskSpace(1),p=t.page('p1');
await p.mouse.move(570,520);await p.mouse.wheel(0,250,{label:'Recorrer las entregas del aula'});
await p.click('[data-action=review][data-id="r1"]',{label:'Abrir la revisión de Marina'});
await p.waitForURL('**#docente/corregir');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/learning/ego-teacher-review.png'}));
console.log(await p.snapshot());
