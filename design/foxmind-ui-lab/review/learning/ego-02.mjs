const t=await taskSpace(1),p=t.page('p1');
await p.reload();
console.log(await p.snapshot());
