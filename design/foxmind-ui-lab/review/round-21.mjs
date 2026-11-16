const t=await taskSpace(5),p=t.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
await p.click('loc=css:button[aria-label="Abrir UX Astra 2026-11-13 · Lectura de una pantalla"]');
await fs.writeFile(dir+'/student-result.txt',await p.snapshot({scope:'full_page'}));
await p.screenshot({path:dir+'/before-student-result.png'});
console.log(await p.snapshot({scope:'full_page'}));
await p.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
await p.screenshot({path:dir+'/before-student-result-mobile.png'});
