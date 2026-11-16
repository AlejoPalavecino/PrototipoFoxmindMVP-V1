const t=await taskSpace(1),p=t.page('p1');
await p.click('@322',{label:'Volver al plan de esta carpeta'});
await p.waitForSelector('loc=css:.fx-plan-dialog');
console.log(await p.evaluate(()=>document.querySelector('.fx-plan-goal').textContent));
await p.click('loc=css:[data-action=fx-plan-close]',{label:'Volver al espacio de estudio'});
await p.click('loc=css:.nav-group a[href="#estudiante/carpetas"]',{label:'Revisar creación de una carpeta'});
await p.click('loc=css:[data-action=new-folder]',{label:'Abrir asistente de cuatro pasos'});
console.log((await p.snapshot()).split('dialog_modal')[1]);
