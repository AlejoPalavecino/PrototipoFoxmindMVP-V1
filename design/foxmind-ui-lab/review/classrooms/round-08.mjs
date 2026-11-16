const t=await taskSpace(1),p=t.page('p1');
await p.click('text="Mis aulas"');
console.log(await p.snapshot());
