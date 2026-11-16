const task=await taskSpace(1),p=task.page('p1');
console.log({before:await p.url()});
await p.evaluate(()=>history.back());await p.waitForURL('**#docente/aula/muro?class=photo');
console.log({back:await p.evaluate(()=>({url:location.hash,title:document.querySelector('main h1').textContent}))});
await p.click('loc=css:[data-role=estudiante]',{label:'Revisando el rol estudiante'});
await p.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
console.log({viewport:await p.evaluate(()=>({width:innerWidth,height:innerHeight})),screenshot:await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/final-audit/ego-student-home.png'})});
console.log(await p.snapshot());
