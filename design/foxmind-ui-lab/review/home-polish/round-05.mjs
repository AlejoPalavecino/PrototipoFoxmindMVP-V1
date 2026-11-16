const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=role:button[name="Eliminar evento"]');
console.log({testEventRemoved:await p.evaluate(()=>!JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).events.some(e=>e.title==='Prueba visual de color'))});
await p.goto('http://127.0.0.1:4173/?v=3.1#docente/inicio');
console.log({title:await p.title(),banner:await p.evaluate(()=>document.querySelector('.home-welcome h1').textContent)});
