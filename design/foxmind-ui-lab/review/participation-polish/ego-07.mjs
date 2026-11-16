const t=await taskSpace(1),p=t.page('p1');
await p.fill('@89','Que comparen dos fotos en un video y expliquen cómo cambia la luz.');
await p.click('@84',{label:'Preparar propuesta con contexto'});
console.log(await p.snapshot());
