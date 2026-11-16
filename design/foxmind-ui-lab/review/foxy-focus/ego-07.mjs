const t=await taskSpace(1),p=t.page('p1');
await p.fill('loc=css:#fx-brief','Un esquema que conecte la exposición, el contraste y la dirección de la luz.');
await p.click('loc=css:[form=fx-tool-form]',{label:'Seguir la preparación del esquema'});
await p.waitForSelector('loc=css:.fx-generation');
console.log(await p.evaluate(()=>({progress:document.querySelector('.fx-generation').innerText,dialogOpen:document.querySelector('dialog').open,chatWidth:document.querySelector('.fx-conversation').getBoundingClientRect().width})));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/foxy-focus/ego-inline-generation.png'});
