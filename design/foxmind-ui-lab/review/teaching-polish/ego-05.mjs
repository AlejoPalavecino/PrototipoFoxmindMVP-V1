const t=await taskSpace(1),p=t.page('p1');
await p.click('@117',{label:'Editar segunda pregunta'});
console.log(await p.snapshot({scope:'full_page'}));
