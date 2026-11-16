const t=await taskSpace(1),p=t.page('p1');
await p.click('@77',{label:'Elegir exposición para trabajar'});
await p.click('@83',{label:'Sumar tema de encuadre'});
await p.click('@88',{label:'Elegir tipo cuestionario'});
await p.click('@92',{label:'Preparar con ayuda de Foxy'});
await p.click('loc=css:[data-action="compose-next"]',{label:'Generar propuesta de actividad'});
await p.waitForSelector('#compose-title');
await p.click('loc=css:[data-action="compose-read-proposal"]',{label:'Leer propuesta completa'});
console.log(await p.snapshot({scope:'full_page'}));
