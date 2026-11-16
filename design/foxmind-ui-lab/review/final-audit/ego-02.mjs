const task=await taskSpace(1),p=task.page('p1');
await p.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await p.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?final-audit=81642edc#docente/inicio');
await p.evaluate(()=>document.fonts.ready);
if(await p.evaluate(()=>document.querySelector('[data-action=nav-toggle]').getAttribute('aria-expanded')==='false'))await p.click('loc=css:[data-action=nav-toggle]',{label:'Expandiendo la navegación docente'});
await p.click('loc=css:a[aria-label="Mis aulas"]',{label:'Revisando las aulas docentes'});
await p.waitForSelector('loc=css:.class-card');console.log(await p.snapshot());
