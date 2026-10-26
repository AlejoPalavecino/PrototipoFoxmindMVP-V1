const fs=await import('node:fs/promises');
const out='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-26-auth-responsive';
const task=await taskSpace(7),p=task.page('p1'),recover=[];
await p.cdp('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:1,mobile:false});
for(const route of ['sign-in','register']){
 await p.goto('http://localhost:52171/'+route);await p.waitForSelector('.button-primary',{state:'visible'});
 await p.evaluate(async()=>{await document.fonts.ready;document.querySelector('h1').textContent='Un título de autenticación intencionalmente largo para comprobar el ajuste de texto';document.querySelector('.button-primary').scrollIntoView({block:'center'});});
 recover.push(await p.evaluate(()=>{const r=document.querySelector('.button-primary').getBoundingClientRect();return{route:location.pathname,viewport:[innerWidth,innerHeight],ctaY:r.y,ctaBottom:r.bottom,visible:r.y>=0&&r.bottom<=innerHeight,client:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};}));
}
await p.cdp('Emulation.setDeviceMetricsOverride',{width:901,height:700,deviceScaleFactor:1,mobile:false});
await p.goto('http://localhost:52171/register');await p.waitForSelector('.button-primary',{state:'visible'});
await p.fill('input[name=password]','local-visual-check-only-with-sixty-characters-abcdefghijklmno');
await p.click('button[aria-label="Mostrar contraseña"]',{label:'Ver texto largo local'});
await p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
const padding=await p.evaluate(()=>({width:innerWidth,height:innerHeight,paddingRight:getComputedStyle(document.querySelector('input[name=password]')).paddingRight,eyeWidth:document.querySelector('.password-toggle').getBoundingClientRect().width,eyeHeight:document.querySelector('.password-toggle').getBoundingClientRect().height}));
await p.screenshot({path:out+'/final-register-password-'+padding.width+'x'+padding.height+'.png'});
await p.click('button[aria-label="Ocultar contraseña"]',{label:'Ocultar texto largo local'});
const masked=await p.evaluate(()=>({type:document.querySelector('input[name=password]').type,pressed:document.querySelector('.password-toggle').getAttribute('aria-pressed')}));
await p.reload();await p.waitForSelector('.button-primary',{state:'visible'});
await fs.writeFile(out+'/closure-check.json',JSON.stringify({recover,padding,masked},null,2));console.log({recover,padding,masked});
