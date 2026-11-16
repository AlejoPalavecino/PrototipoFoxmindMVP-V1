const t=await taskSpace(1),p=t.page('p1');
await p.click('@431',{label:'Cerrar formulario de prueba'});
await p.click('loc=css:[data-action=calendar-view][data-value=month]',{label:'Dejar lista la agenda mensual'});
await p.waitForSelector('loc=css:#agenda-day-panel');
await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/ego-final-student.png'}));
