const t=await taskSpace(1),p=t.page('p1');
await p.click('@301',{label:'Volver un tema a pendiente'});
console.log(await p.evaluate(()=>({plan:document.querySelector('[data-room-section="plan"]').innerText,button:document.querySelector('[data-action="teaching-mark-topic"]').innerText})));
await p.click('loc=css:[data-action="teaching-mark-topic"]',{label:'Restaurar tema como dado'});
await p.click('@264',{label:'Revisar aula como estudiante'});
await p.click('loc=css:.room-section-nav a[href="#estudiante/aula/progreso"]',{label:'Consultar progreso del estudiante'});
console.log(await p.snapshot({scope:'full_page'}));
