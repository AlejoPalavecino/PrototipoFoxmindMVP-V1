const fs=await import('node:fs/promises');
const out='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-26-auth-responsive';
const task=await taskSpace(7),p=task.page('p1');
const recover=[];
for(const route of ['sign-in','register']){
 await p.goto('http://localhost:52171/'+route);await p.waitForSelector('.button-primary',{state:'visible'});
 await p.evaluate(async()=>{await document.fonts.ready;document.querySelector('h1').textContent='Un título de autenticación intencionalmente largo para comprobar el ajuste de texto';document.querySelector('.button-primary').scrollIntoView({block:'center'});});
 recover.push(await p.evaluate(()=>{const r=document.querySelector('.button-primary').getBoundingClientRect();return{route:location.pathname,ctaY:r.y,ctaBottom:r.bottom,visible:r.y>=0&&r.bottom<=innerHeight,client:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth};}));
}
await p.cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await p.goto('http://localhost:52171/sign-in?next=%2Fmis-aulas');await p.waitForSelector('.button-primary',{state:'visible'});
await p.focus('input[name=email]');
await p.screenshot({path:out+'/final-sign-in-focus-1280x720.png'});
await p.click('a[href="/forgot-password"]',{label:'Ver recuperación pública'});
await p.waitForURL('**/forgot-password');
const forgot=await p.url();console.log(await p.snapshot());
await p.goto('http://localhost:52171/register');await p.waitForSelector('.button-primary',{state:'visible'});
await p.fill('input[name=password]','local-visual-check-only');
await p.click('button[aria-label="Mostrar contraseña"]',{label:'Mostrar contraseña temporal'});
await p.click('button[aria-label="Ocultar contraseña"]',{label:'Ocultar contraseña temporal'});
const masked=await p.evaluate(()=>({type:document.querySelector('input[name=password]').type,pressed:document.querySelector('.password-toggle').getAttribute('aria-pressed')}));
await p.reload();await p.waitForSelector('.button-primary',{state:'visible'});
await fs.writeFile(out+'/supplement.json',JSON.stringify({recover,forgot,masked},null,2));
console.log({recover,forgot,masked});
