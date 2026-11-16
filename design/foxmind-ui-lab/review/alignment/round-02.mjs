const t=await taskSpace(1),p=t.page('p1');
console.log({url:await p.url(),state:await p.evaluate(()=>({ready:document.readyState,h1:document.querySelector('h1')?.textContent,widgets:document.querySelectorAll('.home-dashboard>.panel').length}))});
console.log(await p.snapshot());
