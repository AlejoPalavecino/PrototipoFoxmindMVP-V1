const t=await taskSpace(1),p=t.page('p1');
await p.click('@161',{label:'Consultar próxima actividad'});
console.log(await p.snapshot());
