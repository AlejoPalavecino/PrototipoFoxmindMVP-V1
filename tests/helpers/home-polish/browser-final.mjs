const task=await taskSpace(3),page=task.page('p1');
const fs=await import('node:fs/promises');
const evidence='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-25-home-polish';
const results=[];
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
for(const [mode,width,height] of [['teach',1536,1024],['study',1920,1080],['study',1536,1024],['none',1536,1024],['archived',1536,1024],['error',1536,1024],['teach-empty',1536,1024],['study-empty',1536,1024],['study-empty',1536,1024],['teach',768,1024],['study',390,844],['study',320,812],['none',390,844]]) {
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
 await page.goto('http://127.0.0.1:53271/?mode='+mode);
 await page.waitForSelector('.fm-home-toolbar',{state:'visible'});
 await page.evaluate(()=>document.fonts.ready.then(()=>true));
 const data=await page.evaluate(()=>{
  const box=(s)=>document.querySelector(s)?.getBoundingClientRect().toJSON();
  const controls=[...document.querySelectorAll('.fm-home button')].map(el=>({label:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
  return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,hero:box('.fm-home-greeting'),agenda:box('.fm-home-module--agenda'),left:box('.fm-home-work'),right:box('.fm-home-aside'),font:getComputedStyle(document.querySelector('h1')).fontFamily,fontReady:document.fonts.check('600 48px "Fredoka Auth"'),modules:[...document.querySelectorAll('.fm-home-module[aria-label]')].map(x=>x.getAttribute('aria-label')),controls,text:document.querySelector('main').innerText};
 });
 const snapshot=await page.snapshot({scope:'full_page'});
 await fs.writeFile(evidence+'/final-'+mode+'-'+width+'.snapshot.txt',snapshot);
 const screenshot=await page.screenshot({path:evidence+'/final-'+mode+'-'+width+'.png'});
 results.push({mode,...data,screenshot});
}
await fs.writeFile(evidence+'/final-dimensions.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({mode,width,height,scrollWidth,clientWidth,fontReady,hero,agenda,controls})=>({mode,width,height,overflow:scrollWidth-clientWidth,fontReady,heroY:hero.y,agendaY:agenda.y,smallControls:controls.filter(x=>x.height<43.9)}))));
console.log(await page.snapshot());
