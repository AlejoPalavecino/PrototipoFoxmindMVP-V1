const t=await taskSpace(1),p=t.page('p1');
await p.click('@244',{label:'Eliminar solo evento de prueba'});
console.log(await p.snapshot({scope:'subtree',root:'@207'}));
