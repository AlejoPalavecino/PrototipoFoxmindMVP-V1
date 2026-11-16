const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
await p.goto('http://127.0.0.1:4173/?review=31#docente/inicio');
await p.click('loc=role:button[name="Crear actividad"]');
const focus=[];
for(let i=0;i<12;i++){await p.keyboard.press('Tab');focus.push(await p.evaluate(()=>({inside:document.querySelector('dialog').contains(document.activeElement),element:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label')||document.activeElement.value||document.activeElement.innerText?.slice(0,40)})));}
console.log('focus cycle',focus);
await p.keyboard.press('Escape');
console.log('restored focus',await p.evaluate(()=>document.activeElement.getAttribute('data-action')));
await fs.writeFile('C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/dialog-focus-final.json',JSON.stringify(focus,null,2));
await p.screenshot({path:'C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab/final-home-ego.png'});
