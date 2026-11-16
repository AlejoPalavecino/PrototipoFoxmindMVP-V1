const t=await taskSpace(1),p=t.page('p1');
await p.click('@70',{label:'Elegir tema de exposición'});
await p.click('loc=css:input[data-compose="method"][value="ai"]',{label:'Elegir ayuda de Foxy'});
await p.click('loc=css:button[data-action="compose-next"]',{label:'Probar idea docente obligatoria'});
console.log(await p.snapshot());
