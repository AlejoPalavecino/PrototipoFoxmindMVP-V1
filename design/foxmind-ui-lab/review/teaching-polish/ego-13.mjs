const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=css:[data-action="teaching-discard"]',{label:'Descartar material de prueba'});
await p.reload();
await p.click('loc=css:.room-section-nav a[href="#docente/aula/plan"]',{label:'Revisar plan y materiales'});
console.log(await p.snapshot({scope:'full_page'}));
