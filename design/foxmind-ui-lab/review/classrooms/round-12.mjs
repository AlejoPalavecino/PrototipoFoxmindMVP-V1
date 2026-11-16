const t=await taskSpace(1),p=t.page('p1');
await p.click('@100');
await p.waitForSelector('.program-file.ready',{state:'visible',timeout:6000});
await p.click('input[name=class-method][value=ai]');
await p.click('button[data-action=wizard-next]');
await p.waitForSelector('.class-unit-editor',{state:'visible',timeout:6000});
console.log(await p.snapshot({scope:'subtree',root:'@51'}));
