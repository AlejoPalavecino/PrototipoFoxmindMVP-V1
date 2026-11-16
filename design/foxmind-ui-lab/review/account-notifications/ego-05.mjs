const t=await taskSpace(1),p=t.page('p1');
await p.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?account=16-compact-final#docente/perfil');
console.log(await p.evaluate(()=>{const r=document.querySelector('.pf-form button[type=submit]').getBoundingClientRect();return{width:innerWidth,height:innerHeight,saveBottom:r.bottom,saveVisible:r.bottom<=innerHeight};}));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/account-notifications/ego-profile-compact-final.png'});
