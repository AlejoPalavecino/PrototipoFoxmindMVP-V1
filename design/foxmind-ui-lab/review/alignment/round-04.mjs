const t=await taskSpace(1),p=t.page('p1');
console.log({finalPreview:await p.url(),state:await p.evaluate(()=>({ready:document.readyState,heading:document.querySelector('h1')?.textContent,role:document.querySelector('[data-role][aria-pressed=true]')?.dataset.role,widgets:document.querySelectorAll('.home-dashboard>.panel').length,overflow:document.documentElement.scrollWidth>innerWidth+1}))});
