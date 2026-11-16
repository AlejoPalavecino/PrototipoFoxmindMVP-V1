const task=await taskSpace(5),p=task.page('p1');
console.log(await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/before-select-class.png'}));
await p.click('button[aria-label="Cerrar diálogo"]');
await p.click('loc=href:/mis-aulas');
console.log(await p.snapshot({scope:'full_page'}));
