const t=await taskSpace(1),p=t.page('p1');
await p.fill('@256','Evaluación de fotografía y exposición');
await p.click('@266',{label:'Incluir exposición y contraste'});
await p.click('@274',{label:'Preparar mi recorrido de repaso'});
await p.waitForSelector('loc=css:.fx-plan-dialog');
console.log(await p.snapshot({scope:'subtree',root:'@252'}));
