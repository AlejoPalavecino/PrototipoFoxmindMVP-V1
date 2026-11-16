const existing=(await listTaskSpaces()).find(s=>s.id===5);
const task=!existing?await taskSpace('FoxMind · auditoría y maqueta UI'):existing.ownership==='user'?await claimTaskSpace(5):existing.ownership==='agentDelegatedToUser'?await takeOverTaskSpace(5):await taskSpace(5);
const page=(await task.pages())[0]??await task.adopt((await task.tabs())[0].page);
console.log({space:task.spaceId,page:page.label});
await page.goto('http://127.0.0.1:4173/?iteration=2-before#docente/agenda');
await page.cdp('Page.bringToFront');
console.log(await page.evaluate(()=>({heading:document.querySelector('h1')?.textContent,width:innerWidth,calendar:document.querySelector('.calendar').innerText.slice(0,180)})));
await page.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/iteration-2/before-agenda.png'});
