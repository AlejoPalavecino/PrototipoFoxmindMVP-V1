const t=await taskSpace(1),p=t.page('p1');
await p.click('@44');
console.log(await p.snapshot());
