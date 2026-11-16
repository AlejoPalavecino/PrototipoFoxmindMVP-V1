const t=await taskSpace(1),p=t.page('p1');
await p.click('@234',{label:'Volver a respuesta elegida'});
await p.click('@193',{label:'Revisar mesa del docente'});
await p.click('loc=css:button[data-action="review"][data-id="r1"]',{label:'Consultar entrega de Marina'});
console.log(await p.snapshot());
