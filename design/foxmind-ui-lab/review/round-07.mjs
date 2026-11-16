const task=await taskSpace(5),p=task.page('p1');
await p.cdp('Page.bringToFront');
await p.click('loc=role:button[name="Crear actividad"]');
console.log(await p.snapshot({scope:'full_page'}));
