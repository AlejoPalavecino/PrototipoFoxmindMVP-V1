const t=await taskSpace(1),p=t.page('p1');
await p.selectOption('@249',{label:'La luz'});
await p.selectOption('loc=css:[data-teaching-topic-select]',{label:'Exposición'});
await p.click('@252',{label:'Vincular con el cuestionario'});
await p.click('@253',{label:'Vincular también con el trabajo'});
await p.keyboard.press('Escape');
console.log(await p.snapshot({scope:'subtree',root:'@110'}));
