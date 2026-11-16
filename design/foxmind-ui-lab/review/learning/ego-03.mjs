const t=await taskSpace(1),p=t.page('p1');
await p.click('@59',{label:'Preparar una nueva actividad'});
await p.waitForURL('**#docente/crear');
console.log(await p.snapshot({scope:'full_page'}));
