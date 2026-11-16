const t=await taskSpace(1),p=t.page('p1');
await p.reload();
await p.click('loc=css:[data-action="new-activity"]',{label:'Probar creación de actividad'});
console.log(await p.snapshot({scope:'full_page'}));
