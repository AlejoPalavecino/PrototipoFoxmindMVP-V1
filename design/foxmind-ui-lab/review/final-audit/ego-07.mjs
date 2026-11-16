const task=await taskSpace(1),p=task.page('p1');
await p.click('@101',{label:'Abriendo una actividad estudiantil'});
console.log(await p.snapshot());
