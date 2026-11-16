const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
await p.click('loc=role:button[name="Materiales y Plan"]');
await fs.writeFile(dir+'/study-materials.txt',await p.snapshot({scope:'full_page'}));
await p.screenshot({path:dir+'/before-study-materials.png'});
await p.keyboard.press('Escape');
await p.click('loc=href:/mis-aulas?aula=86a39431-32c2-4f7f-8f1e-8decb768a8b5');
await p.waitForSelector('loc=role:button[name="Actividades"]');
console.log(await p.snapshot({scope:'full_page'}));
