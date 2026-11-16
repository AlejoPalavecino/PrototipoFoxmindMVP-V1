const task=await taskSpace(1),p=task.page('p1');
await p.click('@50',{label:'Abriendo el aula de fotografía'});
await p.waitForURL('**#docente/aula/plan?class=photo');
await p.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
console.log({viewport:await p.evaluate(()=>({width:innerWidth,height:innerHeight})),screenshot:await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/final-audit/ego-teacher-plan.png'})});
console.log(await p.snapshot());
