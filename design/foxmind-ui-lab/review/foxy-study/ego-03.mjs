const t=await taskSpace(1),p=t.page('p1');await p.reload();
await p.fill('loc=css:#fx-message','Quiero explicar la exposición con un ejemplo cotidiano.');
await p.click('loc=css:.fx-compose-footer button[type=submit]',{label:'Conversar sobre una idea'});
await p.waitForFunction(()=>document.querySelectorAll('.fx-message').length===2);
await p.click('loc=css:[data-action=fx-tool][data-kind=notes]',{label:'Preparar un apunte docente'});
console.log(await p.snapshot());
