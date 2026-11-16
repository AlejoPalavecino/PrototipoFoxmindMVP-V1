const t=await taskSpace(1),p=t.page('p1');
await p.click('@71',{label:'Elegir tema para practicar'});
await p.click('input[data-compose=topic][value="photo-u1-t0"]',{label:'Sumar otro tema del aula'});
await p.click('input[data-compose=type][value="Evaluación"]',{label:'Elegir tipo de actividad'});
await p.click('input[data-compose=method][value="ai"]',{label:'Preparar con ayuda de Foxy'});
await p.click('[data-action=compose-next]',{label:'Generar una propuesta revisable'});
await p.waitForSelector('#compose-title',{state:'visible'});
console.log(await p.snapshot());
