const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
await p.goto('http://127.0.0.1:4173/#docente/inicio');
await p.click('loc=role:button[name="Crear actividad"]');
const focus=[];
for(let i=0;i<12;i++){await p.keyboard.press('Tab');focus.push(await p.evaluate(()=>({inside:document.querySelector('dialog').contains(document.activeElement),element:document.activeElement.tagName,text:document.activeElement.textContent||document.activeElement.value})));}
console.log('focus cycle',focus);
await p.keyboard.press('Escape');
console.log('restored focus',await p.evaluate(()=>document.activeElement.textContent));
await fs.writeFile('C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/dialog-focus.json',JSON.stringify(focus,null,2));
