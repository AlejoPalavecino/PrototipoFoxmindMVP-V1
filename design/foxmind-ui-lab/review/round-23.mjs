const t=await taskSpace(5),p=t.page('p1');
await p.goto('http://127.0.0.1:4173');
await p.cdp('Page.bringToFront');
console.log(await p.snapshot({scope:'full_page'}));
console.log(await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title})));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/prototype-home-ego.png'});
