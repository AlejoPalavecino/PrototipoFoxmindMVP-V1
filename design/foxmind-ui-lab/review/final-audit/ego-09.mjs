const task=await taskSpace(1),p=task.page('p1');
await p.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
await p.click('loc=role:button[name="Empezar actividad"]',{label:'Revisando la resolución en celular'});
await p.waitForURL('**#estudiante/actividad?activity=light');
console.log({url:await p.url(),viewport:await p.evaluate(()=>({width:innerWidth,height:innerHeight})),screenshot:await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/final-audit/ego-student-question.png'})});
console.log(await p.snapshot());
