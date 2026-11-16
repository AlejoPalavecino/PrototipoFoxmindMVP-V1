const t=await taskSpace(1),p=t.page('p1');
await p.reload();await p.waitForSelector('loc=css:.fx-context-strip');
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/chat-toolbar/ego-final-student-expanded.png'});
console.log(await p.evaluate(()=>({sideOverflow:document.querySelector('.sidebar').scrollWidth>document.querySelector('.sidebar').clientWidth,profileVisible:document.querySelector('.account').getBoundingClientRect().bottom<=innerHeight,quickClasses:[...document.querySelectorAll('.sidebar-classes a')].map(e=>e.textContent.trim())})));
await p.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?toolbar=14-final#docente/foxy');
await p.waitForSelector('loc=css:.fx-context-strip');
await p.click('loc=css:[data-action=nav-toggle]',{label:'Dejar más espacio para conversar'});
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/chat-toolbar/ego-final-teacher.png'});
console.log(await p.evaluate(()=>({hiddenClassrooms:!document.querySelector('.sidebar-classes').getClientRects().length,newChat:document.querySelector('.fx-new-conversation').textContent.trim(),singleHeader:!document.querySelector('.fx-topbar')})));
