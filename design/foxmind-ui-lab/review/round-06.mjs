const task=await taskSpace(5),p=task.page('p1');
console.log(await p.snapshot({scope:'full_page'}));
console.log(await p.evaluate(()=>({viewport:[innerWidth,innerHeight],top:document.elementFromPoint(innerWidth/2,innerHeight/2)?.outerHTML.slice(0,1500),dialogs:[...document.querySelectorAll('dialog')].map(x=>({open:x.open,text:x.textContent?.slice(0,700)}))})));
