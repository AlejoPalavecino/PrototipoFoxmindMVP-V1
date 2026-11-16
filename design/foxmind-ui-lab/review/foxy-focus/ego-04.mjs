const t=await taskSpace(1),p=t.page('p1');await p.reload();
await p.waitForSelector('loc=css:.foxy-space');
await p.click('loc=css:[data-action=fx-tray][data-value=tools]',{label:'Comprobar todas las herramientas visibles'});
await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/foxy-focus/ego-student-tools.png'});
console.log((await p.snapshot()).split('dialog_modal')[1]);
