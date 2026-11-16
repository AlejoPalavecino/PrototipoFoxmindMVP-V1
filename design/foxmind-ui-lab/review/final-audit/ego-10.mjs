const task=await taskSpace(1),p=task.page('p1');
await p.click('loc=role:button[name="Guardar y salir"]',{label:'Volviendo al aula del estudiante'});
await p.click('loc=css:[data-role=docente]',{label:'Dejando lista la maqueta final'});
await p.cdp('Emulation.clearDeviceMetricsOverride');
console.log(await p.evaluate(()=>({title:document.title,url:location.hash,heading:document.querySelector('main h1').textContent,dialogOpen:document.querySelector('dialog').open})));
