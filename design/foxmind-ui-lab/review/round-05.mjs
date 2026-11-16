const task=await taskSpace(5),p=task.page('p1'),fs=await import('node:fs/promises');
const dir='C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/.test-artifacts/ui-lab';
await p.cdp('Page.stopLoading');
try {
 const shot=await p.cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(dir+'/before-teacher-home.png',Buffer.from(shot.data,'base64'));
 console.log('Screenshot captured with CDP');
} catch(e) {console.log({screenshotError:e.message});}
await p.click('text="Crear actividad"');
console.log(await p.snapshot({scope:'full_page'}));
