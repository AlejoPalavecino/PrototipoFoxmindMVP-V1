const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=css:.fx-session:first-child [data-action=fx-session-agenda]',{label:'Ver el primer repaso agendado'});
console.log(await p.snapshot());
