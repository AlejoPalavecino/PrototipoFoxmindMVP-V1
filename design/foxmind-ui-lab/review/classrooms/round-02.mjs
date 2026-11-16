const task=await taskSpace(1),page=(await task.pages())[0];
await page.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html#estudiante/aulas');
console.log({space:task.spaceId,page:page.label});
console.log(await page.snapshot());
