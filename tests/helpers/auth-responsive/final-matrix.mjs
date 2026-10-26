const fs=await import('node:fs/promises');
const out='C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/work-log/evidence/2026-10-26-auth-responsive';
const task=await taskSpace(7),page=task.page('p1');
const sizes=[[1280,720],[1366,768],[1440,900],[1536,864],[1366,640],[1024,768],[901,700],[900,700],[768,1024],[390,844],[320,640],[1536,1024],[1920,1080],[2560,1440]];
const captureWidths=new Set([1280,1366,1440,1536,320,2560]);
const rows=[];
for(const route of ['sign-in','register'])for(const [width,height]of sizes){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await page.goto('http://localhost:52171/'+route+'?next=%2Fmis-aulas');
 await page.waitForSelector('.button-primary',{state:'visible',timeout:15000});
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 await page.waitForFunction(()=>document.querySelector('h1')&&[...document.images].every(i=>i.complete));
 const data=await page.evaluate(()=>{
  const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,font:s.fontSize,lineHeight:s.lineHeight,display:s.display,visibility:s.visibility,overflow:s.overflow,text:e.textContent?.trim().slice(0,100)};};
  const surface=document.querySelector('.surface'),sr=surface.getBoundingClientRect();
  const nodes=[...surface.querySelectorAll('h1,p,label,input,button,a')].filter(e=>getComputedStyle(e).display!=='none');
  return {route:location.pathname,viewport:[innerWidth,innerHeight],devicePixelRatio,scroll:[document.documentElement.clientWidth,document.documentElement.scrollWidth,document.documentElement.scrollHeight],fontReady:document.fonts.check('700 32px "Fredoka Auth"'),heading:box(document.querySelector('h1')),story:box(document.querySelector('.auth-story')),copy:box(document.querySelector('.auth-story-copy')),image:box(document.querySelector('.auth-story img')),surface:box(surface),inputs:[...document.querySelectorAll('input')].map(box),cta:box(document.querySelector('.button-primary')),targets:[...document.querySelectorAll('form button')].map(box),surfaceOverflow:nodes.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.x<sr.x-1||r.right>sr.right+1);}).map(box),links:[...document.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')}))};
 });
 data.requestedViewport=[width,height];
 const label=route+'-'+data.viewport[0]+'x'+data.viewport[1];
 const snapshot=await page.snapshot();
 await fs.writeFile(out+'/final-'+label+'-snapshot.txt',snapshot);
 if(captureWidths.has(width)&&!(width===1366&&height===640)){
  const file=out+'/final-'+label+'.png';await page.screenshot({path:file});
  const bytes=await fs.readFile(file);data.capture={path:file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 }
 rows.push(data);console.log(JSON.stringify({route,width,height,scrollH:data.scroll[2],ctaBottom:data.cta.bottom,heading:data.heading.font,inputFont:data.inputs[0].font,overflow:data.surfaceOverflow,storyH:data.story.height,surfaceH:data.surface.height,capture:data.capture}));
}
await fs.writeFile(out+'/final-matrix.json',JSON.stringify(rows,null,2));
console.log({spaceId:task.spaceId,count:rows.length});
