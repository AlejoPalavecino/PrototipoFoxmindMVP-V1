const t=await taskSpace(1),p=t.page('p1');
await p.click('@136',{label:'Volver al editor docente'});
await p.click('@119',{label:'Salir de propuesta de prueba'});
console.log(await p.snapshot());
