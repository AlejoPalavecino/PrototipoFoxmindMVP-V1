const t=await taskSpace(1),p=t.page('p1');
await p.keyboard.press('Escape');
console.log(await p.evaluate(()=>({dialogOpen:document.querySelector('dialog').open,focus:document.activeElement.textContent.trim(),invitationStillPresent:!!document.querySelector('.invitation-card')})));
await p.click('button[data-role=docente]');
await p.click('a[href="#docente/aulas"]');
console.log(await p.snapshot());
