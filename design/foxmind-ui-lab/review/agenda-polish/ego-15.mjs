const t=await taskSpace(1),p=t.page('p1');
const snapshot=await p.snapshot();console.log(snapshot.slice(snapshot.indexOf('dialog_modal')));
