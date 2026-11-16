const t=await taskSpace(1),p=t.page('p1');
await p.fill('@137','Compará dos encuadres de la misma escena y explicá qué cambia en la historia.');
await p.click('@132',{label:'Revisar criterios de evaluación'});
console.log(await p.snapshot({scope:'full_page'}));
