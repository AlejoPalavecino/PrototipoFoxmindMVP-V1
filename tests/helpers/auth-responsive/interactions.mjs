const fs=await import('node:fs/promises');
const out='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-26-auth-responsive';
const task=await taskSpace(7),page=task.page('p1');
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
await page.goto('http://localhost:52171/sign-in?next=%2Fmis-aulas');
await page.waitForSelector('.button-primary',{state:'visible'});
console.log(await page.snapshot());
await page.fill('input[name=password]','local-visual-check-only');
await page.click('button[aria-label="Mostrar contraseña"]',{label:'Mostrar contraseña local'});
const shown=await page.evaluate(()=>({type:document.querySelector('input[name=password]').type,pressed:document.querySelector('.password-toggle').getAttribute('aria-pressed'),buttonType:document.querySelector('.password-toggle').type}));
await page.click('button[aria-label="Ocultar contraseña"]',{label:'Ocultar contraseña local'});
await page.focus('input[name=email]');
const focus=[];
for(let i=0;i<5;i++){
 focus.push(await page.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return {tag:e.tagName,name:e.getAttribute('name'),text:e.textContent.trim(),aria:e.getAttribute('aria-label'),outline:s.outline,boxShadow:s.boxShadow};}));
 if(i<4)await page.keyboard.press('Tab');
}
await page.reload();
await page.waitForSelector('.button-primary',{state:'visible'});
console.log(await page.snapshot({scope:'full_page'}));
const links=await page.evaluate(()=>[...document.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})));
await page.click('a[href="/register?next=%2Fmis-aulas"]',{label:'Ver creación de cuenta'});
await page.waitForURL('**/register?next=%2Fmis-aulas');
await page.waitForSelector('.button-primary',{state:'visible'});
const navigated=await page.url();
await page.fill('input[name=password]','local-visual-check-only');
await page.click('button[aria-label="Mostrar contraseña"]',{label:'Mostrar contraseña registro'});
const registerShown=await page.evaluate(()=>({type:document.querySelector('input[name=password]').type,pressed:document.querySelector('.password-toggle').getAttribute('aria-pressed')}));
await page.reload();
const reflow=[];
for(const route of ['sign-in','register']){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:1,mobile:false});
 await page.goto('http://localhost:52171/'+route);
 await page.waitForSelector('.button-primary',{state:'visible'});
 await page.evaluate(async()=>{await document.fonts.ready;document.querySelector('h1').textContent='Un título de autenticación intencionalmente largo para comprobar el ajuste de texto';});
 const before=await page.evaluate(()=>({width:innerWidth,height:innerHeight,client:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,titleHeight:document.querySelector('h1').getBoundingClientRect().height}));
 await page.evaluate(()=>document.querySelector('.button-primary').scrollIntoView({block:'end'}));
 const after=await page.evaluate(()=>{const e=document.querySelector('.button-primary'),r=e.getBoundingClientRect();return {ctaY:r.y,ctaBottom:r.bottom,ctaHeight:r.height,visible:r.y>=0&&r.bottom<=innerHeight,inputs:[...document.querySelectorAll('input')].map(e=>({font:getComputedStyle(e).fontSize,display:getComputedStyle(e).display}))};});
 reflow.push({route,simulation:'640x360 CSS viewport equivalent reflow area of 1280x720 at 200%; native zoom NOT tested; heading transient DOM fixture',before,after});
 console.log(await page.snapshot());
}
await page.reload();
await fs.writeFile(out+'/interactions.json',JSON.stringify({shown,registerShown,focus,links,navigated,reflow},null,2));
console.log({shown,registerShown,focus,navigated,reflow});
