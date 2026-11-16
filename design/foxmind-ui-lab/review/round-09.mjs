const t=await taskSpace(5),p=t.page('p1');
await p.click('loc=role:button[name="Entrar al aula Fotografía y luz"]');
console.log(await p.snapshot({scope:'full_page'}));
