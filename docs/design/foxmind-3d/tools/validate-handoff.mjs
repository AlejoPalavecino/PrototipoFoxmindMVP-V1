import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[],warnings=[];
const assert=(ok,label)=>{if(!ok)failures.push(label)};
const manifest=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
let raster=0,alpha=0,bytes=0,maxBytes=0;
for(const a of manifest.assets){
 const master=await sharp(path.join(root,a.master)).metadata();assert(master.format==='webp',`master ${a.id}`);
 for(const v of a.variants){
  const p=path.join(root,v.path),buf=await fs.readFile(p),m=await sharp(p).metadata();
  await sharp(p).raw().toBuffer();
  assert(m.format==='webp'&&m.width===v.width&&m.height===v.height,`format/size ${v.path}`);
  assert(buf.length===v.bytes&&crypto.createHash('sha256').update(buf).digest('hex')===v.sha256,`hash ${v.path}`);
  assert(!m.exif&&!m.icc&&!m.xmp,`metadata ${v.path}`);
  if(a.id.startsWith('states/'))assert(m.hasAlpha,`alpha ${v.path}`);
  raster++;bytes+=buf.length;maxBytes=Math.max(maxBytes,buf.length);if(m.hasAlpha)alpha++;
 }
}
const vector=JSON.parse(await fs.readFile(path.join(root,'vector-manifest.json'),'utf8'));
const brand=JSON.parse(await fs.readFile(path.join(root,'brand-manifest.json'),'utf8'));
const provenance=JSON.parse(await fs.readFile(path.join(root,brand.source),'utf8'));
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
assert(hash(await fs.readFile(path.join(root,provenance.canonical)))===provenance.canonicalSha256,'original canonical logo identity');
for(const v of brand.variants){
 const buffer=await fs.readFile(path.join(root,v.path)),m=await sharp(buffer).metadata();
 assert(hash(buffer)===v.sha256&&buffer.length===v.bytes&&m.format==='webp'&&m.hasAlpha&&m.width===v.width&&m.height===v.height,`original logo WebP ${v.path}`);
}
let svg=0;
for(const v of vector.assets){
 const source=await fs.readFile(path.join(root,v.path),'utf8');
 const approved=brand.svgAssets.find(a=>a.path===v.path&&a.representation==='hybrid-original-raster');
 assert(/<svg\b/.test(source)&&!/<(?:script|foreignObject|text)\b/i.test(source),`safe SVG ${v.path}`);
 if(approved){
  const embedded=[...source.matchAll(/href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g)];
  assert(embedded.length===1&&hash(Buffer.from(embedded[0][1],'base64'))===approved.embeddedSha256,`approved original embedded logo ${v.path}`);
  assert(brand.variants.some(a=>a.path===approved.embeddedRaster&&a.sha256===approved.sourceRasterSha256),'embedded source registered');
  const expectedPNG=await sharp(path.join(root,approved.embeddedRaster)).png({compressionLevel:9}).toBuffer();
  assert(hash(expectedPNG)===approved.embeddedSha256,'embedded raster matches original WebP pixels');
 }else assert(!/<image\b|data:image/i.test(source),`true vector ${v.path}`);
 assert(!/https?:\/\/(?!www\.w3\.org)|(?:href|src)="(?!data:image\/png;base64,)/i.test(source),`external SVG ${v.path}`);
 if(!v.path.endsWith('sprite.svg')){
  const rendered=await sharp(Buffer.from(source)).resize(64).ensureAlpha().raw().toBuffer();
  assert(rendered.some((value,i)=>i%4===3&&value>0),`nonempty rendered SVG ${v.path}`);
 }
 svg++;
}
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();
let links=0;
for(const p of (await walk(root)).filter(f=>f.endsWith('.md'))){
 const txt=await fs.readFile(p,'utf8');
 for(const m of txt.matchAll(/\]\(([^)]+)\)/g)){
  const link=m[1].replace(/^<|>$/g,'');
  if(/^(?:https?:|mailto:|#|file:)/.test(link))continue;
  const dest=decodeURIComponent(link.split('#')[0]);if(!dest)continue;
  try{await fs.access(path.resolve(path.dirname(p),dest));links++}catch{failures.push(`link ${path.relative(root,p)} -> ${link}`)}
 }
}
const cov=JSON.parse(await fs.readFile(path.join(root,'coverage.json'),'utf8'));
const screen=JSON.parse(await fs.readFile(path.join(root,'review/screen-index.json'),'utf8'));
assert(cov.flows.length===82&&new Set(cov.flows.map(f=>f.id)).size===82,'82 unique coverage IDs');
assert(cov.flows.every(f=>screen.some(s=>s.id===f.id)),'every ID indexed visually');
const repo=path.resolve(root,'../../..');
for(const r of cov.existingPages){try{await fs.access(path.join(repo,r.source))}catch{failures.push(`route source ${r.source}`)}}
const rgb=h=>h.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const lum=h=>rgb(h).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const pairs=[['ink/orange','#202522','#FF782D',4.5],['ink/hover','#202522','#F2691C',4.5],['muted/white','#5B6260','#FFFFFF',4.5],['link/white','#9A3E00','#FFFFFF',4.5],['danger/white','#B3261E','#FFFFFF',4.5],['success/white','#156442','#FFFFFF',4.5],['focus/canvas','#4453B8','#FCFAF7',3],['control/white','#7A817E','#FFFFFF',3]];
const contrasts=pairs.map(([name,foreground,background,minimum])=>{const observed=ratio(foreground,background);assert(observed>=minimum,`contrast ${name}`);return{name,foreground,background,minimum,ratio:Number(observed.toFixed(2))}});
const report={date:'2026-10-25',status:failures.length?'FAIL':'PASS',rasterFiles:raster,transparentVariants:alpha,masterFiles:manifest.assets.length,bytes,largestBytes:maxBytes,svgFiles:svg,originalLogoWebPs:brand.variants.length,hybridBrandSVGs:brand.svgAssets.filter(a=>a.representation==='hybrid-original-raster').length,originalLogoSha256:provenance.originalSha256,flowIds:cov.flows.length,existingPages:cov.existingPages.length,localMarkdownLinks:links,contrasts,failures,warnings,scope:'Artifact structure, decode, hashes, original logo identity, explicit hybrid SVGs, vector icons, links and source existence. No product functional test.'};
await fs.mkdir(path.join(root,'checks'),{recursive:true});
await fs.writeFile(path.join(root,'checks/validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(failures.length)process.exitCode=1;
