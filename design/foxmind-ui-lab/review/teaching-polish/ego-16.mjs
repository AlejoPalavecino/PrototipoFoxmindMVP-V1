const t=await taskSpace(1),p=t.page('p1');
await p.click('@314',{label:'Entrar al aula del estudiante'});
await p.click('loc=css:.room-section-nav a[href="#estudiante/aula/progreso"]',{label:'Consultar progreso del estudiante'});
console.log(await p.snapshot({scope:'full_page'}));
