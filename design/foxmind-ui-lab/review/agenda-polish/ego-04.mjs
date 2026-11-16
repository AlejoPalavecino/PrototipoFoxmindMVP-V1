const t=await taskSpace(1),p=t.page('p1');
await p.reload();
await p.click('loc=css:button[data-action="new-event"]',{label:'Probar nuevo formulario de evento'});
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/ego-new-form.png'}));
console.log(await p.snapshot({scope:'subtree',root:'loc=css:dialog'}));
