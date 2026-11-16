const t=await taskSpace(1),p=t.page('p1');
await p.click('@241',{label:'Editar el evento creado'});
await p.fill('loc=css:#f-title','Repaso de prueba · Editado');
await p.click('loc=css:label.event-color-option.event-blue',{label:'Cambiar el color elegido'});
await p.click('loc=css:button[form=event-form]',{label:'Guardar cambios del evento'});
await p.waitForSelector('loc=css:dialog[open]',{state:'hidden'});
await p.click("loc=role:button[name='Ver Repaso de prueba · Editado, de 16:00 a 16:30']",{label:'Comprobar el evento editado'});
console.log(await p.snapshot({scope:'subtree',root:'@207'}));
