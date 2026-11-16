const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
await p.click('loc=role:button[name="Semana"]');
await p.screenshot({path:dir+'/before-agenda-week.png'});
await p.click('loc=role:button[name="Día"]');
await p.screenshot({path:dir+'/before-agenda-day.png'});
await p.click('loc=role:button[name="Crear evento"]');
await fs.writeFile(dir+'/agenda-form.txt',await p.snapshot({scope:'full_page'}));
await p.screenshot({path:dir+'/before-agenda-form.png'});
await p.keyboard.press('Escape');
for(const route of ['/profile','/settings']) {
 await p.goto('http://127.0.0.1:3000'+route);
 const snapshot=await p.snapshot({scope:'full_page'});
 await fs.writeFile(dir+route.replace('/','/teacher-')+'.txt',snapshot);
 await p.screenshot({path:dir+'/before'+route.replace('/','-')+'.png'});
}
console.log(await p.snapshot({scope:'full_page'}));
