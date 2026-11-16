const t=await taskSpace(1),p=t.page('p1');
await p.fill('@160','Relaciona exposición y encuadre con sus propias imágenes y explica sus decisiones.');
await p.click('@155',{label:'Equilibrar peso de criterios'});
await p.click('loc=css:[data-action="leave-focus"]',{label:'Salir de actividad de prueba'});
console.log(await p.snapshot());
