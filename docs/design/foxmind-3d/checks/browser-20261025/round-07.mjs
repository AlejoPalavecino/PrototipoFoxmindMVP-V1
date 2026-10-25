const task=await taskSpace(7);const page=task.page('p1');
const base='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-3d/';
const shots=[['home-final','HOME-01/mixed/normal',1440],['auth-final','AUTH-02/default/normal',390],['home-mobile-final','HOME-01/study/normal',390],['authoring-final','ACT-04/quiz/normal',1440],['classrooms-final','CLASS-01/default/normal',1440],['plan-final','PLAN-01/student/normal',1440],['submission-final','SUB-03/exam/normal',390],['agenda-final','AGENDA-04/default/normal',320]];
for(const[name,hash,width]of shots){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 await page.goto('file:///'+base+'review/screens.html#'+hash);
 await page.waitForFunction(id=>document.title.startsWith(id+' ·'),hash.split('/')[0],{timeout:5000});
 if(await page.evaluate(()=>document.querySelector('#toggle-review').getAttribute('aria-expanded')==='true'))await page.click('loc=css:#toggle-review');
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0)});
 await page.screenshot({path:base+'checks/browser-20261025/'+name+'.png'});
 console.log({name,title:await page.title()});
}
await page.goto('file:///'+base+'review/index.html');
console.log(await page.snapshot());
