const t=await taskSpace(1),p=t.page('p1');
await p.click('loc=css:[data-action=fx-tray][data-value=tools]',{label:'Revisar el panel de herramientas'});
await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/foxy-focus/ego-student-tools-final.png'});
await p.click('loc=css:[data-action=fx-tray-close]',{label:'Dejar el chat listo para probar'});
console.log(await p.evaluate(()=>({title:document.querySelector('.fx-topbar h1').textContent,panelOpen:document.querySelector('dialog').open})));
