const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=role:button[name="Ver entregas"]',{label:'Ver las entregas del grupo'});
await p.waitForURL('**#docente/actividad-detalle/entregas');
console.log(await p.snapshot());
