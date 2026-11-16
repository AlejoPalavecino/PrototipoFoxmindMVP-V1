const t=await taskSpace(1),p=t.page('p1');
await p.click('@199',{label:'Abrir las carpetas de estudio'});
await p.click('loc=css:[data-folder="0"]',{label:'Entrar al espacio de fotografía'});
console.log(await p.snapshot());
