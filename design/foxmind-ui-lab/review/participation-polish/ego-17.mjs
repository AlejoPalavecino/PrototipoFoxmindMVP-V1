const t=await taskSpace(1),p=t.page('p1');
await p.click('@205',{label:'Ir a revisión de respuestas'});
await p.click('loc=css:button[data-action="review-submission"]',{label:'Revisar entrega sin confirmar'});
console.log(await p.snapshot());
