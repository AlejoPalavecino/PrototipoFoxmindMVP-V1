const t=await taskSpace(1),p=t.page('p1');
console.log(await p.snapshot({scope:'subtree',root:'@207'}));
