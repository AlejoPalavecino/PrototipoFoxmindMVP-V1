const entry=(await listTaskSpaces()).find(s=>s.id===1);
const t=!entry?await taskSpace('FoxMind · auditoría y maqueta UI'):entry.ownership==='user'?await claimTaskSpace(1):entry.ownership==='agentDelegatedToUser'?await takeOverTaskSpace(1):await taskSpace(1);
const p=(await t.pages())[0]??await t.adopt((await t.tabs())[0].page);
console.log({space:t.spaceId,page:p.label});console.log(await p.snapshot());
