const t=await taskSpace(1),p=t.page('p1');
await p.cdp('Page.reload',{ignoreCache:true});
console.log(await p.snapshot());
