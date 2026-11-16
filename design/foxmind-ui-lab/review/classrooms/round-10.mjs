const t=await taskSpace(1),p=t.page('p1');
await p.fill('@85','Explorar con imágenes');
await p.fill('@86','Arte');
await p.fill('@87','3.º A');
await p.click('@92');
console.log(await p.snapshot({scope:'subtree',root:'loc=css:#dialog'}));
