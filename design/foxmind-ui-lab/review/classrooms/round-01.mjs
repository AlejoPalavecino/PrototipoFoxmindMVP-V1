const entry=(await listTaskSpaces()).find(s=>s.id===1);
const task=!entry?await taskSpace('FoxMind · auditoría y maqueta UI'):entry.ownership==='user'?await claimTaskSpace(1):entry.ownership==='agentDelegatedToUser'?await takeOverTaskSpace(1):await taskSpace(1);
const page=(await task.pages())[0]??await task.adopt((await task.tabs())[0].page);
await page.goto('http://127.0.0.1:4173/?v=6#estudiante/aulas');
console.log({space:task.spaceId,page:page.label});
console.log(await page.snapshot());
