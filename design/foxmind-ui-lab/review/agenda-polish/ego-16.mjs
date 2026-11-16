const t=await taskSpace(1),p=t.page('p1');
await p.click('@341',{label:'Cerrar formulario sin cambios'});
await p.reload();
await p.click('loc=css:.agenda-heading [data-action=new-event]',{label:'Revisar validación del estudiante'});
await p.click('loc=css:button[form=event-form]',{label:'Mostrar el nombre requerido'});
await p.waitForSelector('loc=css:#f-title[aria-invalid=true]');
await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/agenda-polish/ego-student-error.png'}));
const snapshot=await p.snapshot();console.log(snapshot.slice(snapshot.indexOf('dialog_modal')));
