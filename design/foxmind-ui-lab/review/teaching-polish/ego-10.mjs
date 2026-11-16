const t=await taskSpace(1),p=t.page('p1');
await p.click('@203',{label:'Abrir biblioteca del aula'});
await p.click('loc=css:[data-action="teaching-add"]',{label:'Probar carga de material'});
console.log(await p.snapshot());
