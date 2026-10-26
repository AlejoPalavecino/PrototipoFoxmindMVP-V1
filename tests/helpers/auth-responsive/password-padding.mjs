const fs=await import('node:fs/promises');
const out='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-26-auth-responsive';
const task=await taskSpace(7),p=task.page('p1'),rows=[];
for(const width of [901,1366])for(const route of ['sign-in','register']){
 await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:768,deviceScaleFactor:1,mobile:false});
 await p.goto('http://localhost:52171/'+route);await p.waitForSelector('.button-primary',{state:'visible'});
 await p.fill('input[name=password]','local-visual-check-only-with-sixty-characters-abcdefghijklmno');
 await p.click('button[aria-label="Mostrar contraseña"]',{label:'Mostrar texto de prueba'});
 rows.push(await p.evaluate(()=>{const i=document.querySelector('input[name=password]'),e=document.querySelector('.password-toggle'),s=getComputedStyle(i),r=i.getBoundingClientRect(),b=e.getBoundingClientRect();return {route:location.pathname,width:innerWidth,paddingRight:s.paddingRight,inputFont:s.fontSize,inputHeight:r.height,eyeHeight:b.height,eyeWidth:b.width,eyeInside:b.x>=r.x&&b.right<=r.right,ctaBottom:document.querySelector('.button-primary').getBoundingClientRect().bottom};}));
 if(width===901&&route==='register'){
  const actual=await p.evaluate(()=>({width:innerWidth,height:innerHeight}));
  await p.screenshot({path:out+`/final-register-password-${actual.width}x${actual.height}.png`});
 }
 await p.reload();
}
await fs.writeFile(out+'/password-padding.json',JSON.stringify(rows,null,2));console.log(rows);
