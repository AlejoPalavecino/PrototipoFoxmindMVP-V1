const t=await taskSpace(1),p=t.page('p1');
await p.setInputFiles('#teaching-file',['C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/teaching-polish/guia-observacion-demo.txt']);
await p.fill('loc=css:[data-teaching-field="title"]','Guía de observación · prueba local');
await p.click('loc=css:[data-action="teaching-prepare"]',{label:'Preparar archivo de ejemplo'});
await p.waitForSelector('[data-teaching-unit]');
console.log(await p.snapshot());
