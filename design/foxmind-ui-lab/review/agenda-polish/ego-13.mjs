const t=await taskSpace(1),p=t.page('p1');
await p.click('@249',{label:'Confirmar limpieza de prueba'});
await p.waitForSelector('loc=css:dialog[open]',{state:'hidden'});
await p.reload();
await p.click("loc=role:button[name='Estudiante']",{label:'Revisar agenda del estudiante'});
await p.click('loc=css:nav a[href="#estudiante/agenda"]',{label:'Abrir agenda del estudiante'});
await p.click('loc=css:[data-action=calendar-view][data-value=week]',{label:'Consultar eventos de la semana'});
await p.waitForFunction(()=>document.querySelector('.agenda-week-list')&&document.querySelectorAll('.agenda-week-group').length===1);
console.log(await p.snapshot());
