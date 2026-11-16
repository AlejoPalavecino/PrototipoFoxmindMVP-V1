const t=await taskSpace(1),p=t.page('p1');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/ego-student-week.png'}));
await p.click('@272',{label:'Ver el día elegido'});
await p.click('loc=css:.agenda-heading [data-action=new-event]',{label:'Crear evento como estudiante'});
await p.click('loc=css:button[form=event-form]',{label:'Comprobar el nombre requerido'});
await p.waitForSelector('loc=css:#f-title[aria-invalid=true]');
console.log(await p.snapshot({scope:'subtree',root:'@207'}));
