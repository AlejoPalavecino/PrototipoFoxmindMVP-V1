const entry=(await listTaskSpaces()).find(s=>s.id===1);
const task=!entry?await taskSpace('FoxMind · auditoría y maqueta UI'):entry.ownership==='user'?await claimTaskSpace(1):entry.ownership==='agentDelegatedToUser'?await takeOverTaskSpace(1):await taskSpace(1);
const p=(await task.pages())[0]??await task.adopt((await task.tabs())[0].page);
await p.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?foxy=12#docente/foxy');
console.log({space:task.spaceId,page:p.label});console.log(await p.snapshot());
