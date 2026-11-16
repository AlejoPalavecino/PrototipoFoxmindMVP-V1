const t=await taskSpace(1),p=t.page('p1');
await p.goto('http://127.0.0.1:4173/?v=3#docente/inicio');
console.log({finalPreview:await p.url(),greeting:await p.evaluate(()=>document.querySelector('#home-title')?.textContent),keyboardDestination:await p.evaluate(()=>document.activeElement.id)});
