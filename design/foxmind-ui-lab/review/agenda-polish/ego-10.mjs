const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=css:label.event-color-option.event-green',{label:'Identificar evento en verde'});
await p.fill('loc=css:#event-note','Repasar las ideas de la unidad.');
await p.click('loc=css:button[form=event-form]',{label:'Guardar evento de prueba'});
await p.waitForSelector('loc=css:dialog[open]',{state:'hidden'});
await p.click("loc=role:button[name='Ver Repaso de prueba · Agenda, de 16:00 a 16:30']",{label:'Consultar el evento creado'});
console.log(await p.snapshot({scope:'subtree',root:'@207'}));
