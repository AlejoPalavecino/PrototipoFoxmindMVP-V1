const t=await taskSpace(1),p=t.page('p1');
await p.click('@78',{label:'Elegir trabajo práctico'});
await p.click('@84',{label:'Comprobar idea obligatoria'});
console.log(await p.snapshot());
