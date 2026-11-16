const entry=(await listTaskSpaces()).find(s=>s.id===1);
const t=!entry?await taskSpace('FoxMind · auditoría y maqueta UI'):entry.ownership==='user'?await claimTaskSpace(1):entry.ownership==='agentDelegatedToUser'?await takeOverTaskSpace(1):await taskSpace(1);
const p=(await t.pages())[0]??await t.adopt((await t.tabs())[0].page);
console.log({space:t.spaceId,page:p.label});
await p.goto('http://127.0.0.1:4173/?v=5#estudiante/inicio');
await p.cdp('Page.bringToFront');
await p.evaluate(()=>window.scrollTo(0,document.querySelector('.day-planner').getBoundingClientRect().top+scrollY-60));
console.log(await p.snapshot());
