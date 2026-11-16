const t=await taskSpace(5),p=t.page('p1');
await p.waitForFunction(()=>document.querySelector('h1')?.textContent.includes('Carpetas'));
console.log(await p.snapshot({scope:'full_page'}));
