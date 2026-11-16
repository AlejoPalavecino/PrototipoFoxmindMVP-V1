const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
await p.screenshot({path:dir+'/before-teacher-foxy.png'});
await fs.writeFile(dir+'/teacher-foxy.txt',await p.snapshot({scope:'full_page'}));
await p.click('loc=href:/agenda');
await p.waitForFunction(()=>document.querySelector('h1')?.textContent==='Agenda');
await p.screenshot({path:dir+'/before-teacher-agenda.png'});
console.log(await p.snapshot({scope:'full_page'}));
