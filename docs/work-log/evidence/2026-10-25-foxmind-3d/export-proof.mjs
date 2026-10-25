import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const output=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(output,'../../../..');
const scratch=path.join(repo,'.test-artifacts/foxmind-3d-proof-renders');
await fs.mkdir(scratch,{recursive:true});
await fs.mkdir(path.join(output,'sources'),{recursive:true});
const inputs=[
 ['inicio','home-1440',1440], ['aulas','mis-aulas-decoded-1440',1440],
 ['plan','plan-from-home-1440',1440], ['agenda','agenda-1440',1440],
 ['perfil','profile-1440',1440], ['configuracion','settings-1440',1440],
 ['inicio-movil','home-390',390], ['aulas-movil','mis-aulas-decoded-320',320],
 ['aulas-tablet','mis-aulas-decoded-768',768], ['plan-movil','plan-from-home-320',320],
 ['plan-estudiante','plan-from-all-1440',1440], ['agenda-movil','agenda-390',390],
 ['perfil-movil','profile-320',320], ['configuracion-movil','settings-390',390],
];
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const records=[];
for(const [id,source,viewportWidth] of inputs){
 const original=`.test-artifacts/foxmind-3d-group5-${source}.test.pdf`;
 const pdf=await fs.readFile(path.join(repo,original));
 await fs.writeFile(path.join(output,'sources',`${id}.pdf`),pdf);
 const temporary=path.join(scratch,id);
 const rendered=spawnSync('pdftoppm',['-f','1','-singlefile','-r','96','-png',path.join(repo,original),temporary],{encoding:'utf8'});
 if(rendered.status!==0)throw new Error(`PDF render failed ${id}: ${rendered.stderr}`);
 const png=await fs.readFile(`${temporary}.png`),metadata=await sharp(png).metadata();
 const webp=await sharp(png).webp({lossless:true,effort:6}).toBuffer();
 const before=await sharp(png).ensureAlpha().raw().toBuffer();
 const after=await sharp(webp).ensureAlpha().raw().toBuffer();
 if(!before.equals(after))throw new Error(`Lossless proof pixel mismatch: ${id}`);
 await fs.writeFile(path.join(output,`${id}.webp`),webp);
 records.push({id,original,pdf:`sources/${id}.pdf`,pdfSha256:hash(pdf),
  image:`${id}.webp`,width:metadata.width,height:metadata.height,viewportWidth,
  bytes:webp.length,sha256:hash(webp),losslessPixelsVerified:true,page:1,
  provenance:'Authenticated ego Space9, media-screen PDF export; not Page.captureScreenshot'});
}
const layers=[];
for(const [index,record] of records.slice(0,6).entries()){
 const image=await sharp(path.join(output,record.image)).resize(720,500,{fit:'contain',background:'#fcfaf7'}).toBuffer();
 layers.push({input:image,left:index%2*720,top:Math.floor(index/2)*500});
}
await sharp({create:{width:1440,height:1500,channels:3,background:'#fcfaf7'}})
 .composite(layers).webp({quality:90,effort:6}).toFile(path.join(output,'vista-general.webp'));
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({date:'2026-10-25',space:9,
 scope:'Real product pages on owned synthetic fixtures; PDF-screen raster proof with print pagination/fixed-header limits.',
 productReviewTree:'9ad34da620d1336700a88dccf5fabeb78f3689d9',screens:records},null,2)+'\n');
console.log(JSON.stringify({proofImages:records.length,pixels:'exact WebP/PNG equality',bytes:records.reduce((sum,r)=>sum+r.bytes,0)}));
