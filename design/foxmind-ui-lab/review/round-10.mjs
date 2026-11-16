const t=await taskSpace(5),p=t.page('p1');
await p.waitForSelector('text="Biblioteca"');
console.log(await p.snapshot({scope:'full_page'}));
