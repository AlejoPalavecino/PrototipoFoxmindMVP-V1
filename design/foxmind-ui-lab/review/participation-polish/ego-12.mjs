const t=await taskSpace(1),p=t.page('p1');
await p.click('@146',{label:'Descartar propuesta de prueba'});
await p.click('@31',{label:'Revisar experiencia del estudiante'});
await p.click('loc=css:a[data-class="photo"]',{label:'Entrar al aula de fotografía'});
await p.click('loc=css:a[href="#estudiante/aula/actividades"]',{label:'Consultar actividades del aula'});
console.log(await p.snapshot());
