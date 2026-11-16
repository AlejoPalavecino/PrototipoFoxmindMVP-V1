const t=await taskSpace(1),p=t.page('p1');
await p.click('[data-action=learning-leave-review]',{label:'Volver a las entregas'});
await p.waitForURL('**#docente/actividad-detalle/entregas');
await p.click('[data-action=back-activities]',{label:'Dejar el aula para recorrer'});
await p.waitForURL('**#docente/aula/actividades');
console.log(await p.snapshot());
