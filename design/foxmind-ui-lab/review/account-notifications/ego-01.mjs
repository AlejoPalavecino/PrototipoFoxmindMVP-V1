const entry=(await listTaskSpaces()).find(s=>s.id===1);
const task=!entry?await taskSpace('FoxMind UI Lab'):entry.ownership==='user'?await claimTaskSpace(1):entry.ownership==='agentDelegatedToUser'?await takeOverTaskSpace(1):await taskSpace(1);
const page=(await task.pages())[0]??await task.adopt((await task.tabs())[0].page);
console.log({space:task.spaceId,page:page.label});
await page.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?account=before#docente/avisos');
await page.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/account-notifications/before-notifications.png'});
await page.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?account=before#estudiante/perfil');
console.log(await page.snapshot());
await page.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/account-notifications/before-profile.png'});
