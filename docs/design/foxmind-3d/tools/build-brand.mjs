import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=path.join(root,'sources/brand'), output=path.join(root,'assets/brand');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
await fs.mkdir(sources,{recursive:true});
await fs.mkdir(output,{recursive:true});
const originalPath=process.argv[2];
if(originalPath){
  const original=await fs.readFile(originalPath);
  const metadata=await sharp(original).metadata();
  const lossless=await sharp(original).webp({lossless:true,effort:6}).toBuffer();
  const before=await sharp(original).ensureAlpha().raw().toBuffer();
  const after=await sharp(lossless).ensureAlpha().raw().toBuffer();
  const equal=before.length===after.length&&before.every((value,i)=>(i%4===3||before[i-i%4+3]>0)?value===after[i]:true);
  if(!equal)throw new Error('Original visible pixels or alpha changed during lossless export');
  await fs.writeFile(path.join(sources,'zorroh-original.webp'),lossless);
  await fs.writeFile(path.join(sources,'manifest.json'),JSON.stringify({
    source:'archive/marca-original/ZorroH.png',originalSha256:hash(original),
    width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,
    canonical:'sources/brand/zorroh-original.webp',canonicalSha256:hash(lossless),
    visiblePixelsAndAlphaPreserved:true,processing:'Lossless format conversion only; no crop, recoloring or redrawing.'
  },null,2)+'\n');
}
const provenance=JSON.parse(await fs.readFile(path.join(sources,'manifest.json'),'utf8'));
const canonical=await fs.readFile(path.join(root,provenance.canonical));
if(hash(canonical)!==provenance.canonicalSha256)throw new Error('Canonical original logo hash mismatch');
const variants=[];
for(const width of [128,256,512]){
  const buffer=await sharp(canonical).resize({width}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
  const metadata=await sharp(buffer).metadata();
  const relative=`assets/brand/zorroh-${width}.webp`;
  await fs.writeFile(path.join(root,relative),buffer);
  variants.push({path:relative,width,height:metadata.height,bytes:buffer.length,sha256:hash(buffer)});
}
const wordmark=await fs.readFile(path.join(sources,'wordmark.svg'),'utf8');
const words=wordmark.replace(/^.*?<title>FoxMind<\/title>/s,'').replace(/<\/svg>\s*$/,'');
const raster=await fs.readFile(path.join(root,variants[2].path));
// PNG inside SVG is supported by both browsers and librsvg; standalone UI images remain WebP.
const embeddedPNG=await sharp(raster).png({compressionLevel:9}).toBuffer();
const embedded=`data:image/png;base64,${embeddedPNG.toString('base64')}`;
const picture=(x,y,width,height)=>`<image x="${x}" y="${y}" width="${width}" height="${height}" xlink:href="${embedded}"/>`;
const svg=(viewBox,content)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" role="img" aria-label="FoxMind"><title>FoxMind</title>${content}</svg>\n`;
const horizontal=picture(0,5,240,160)+`<g transform="translate(220 30)">${words}</g>`;
const compositions={
  'mark.svg':svg('0 0 256 256',picture(0,42.667,256,170.667)),
  'favicon.svg':svg('0 0 256 256',picture(0,42.667,256,170.667)),
  'logo-horizontal.svg':svg('0 0 680 180',horizontal),
  'logo-horizontal-inverse.svg':svg('0 0 680 180',horizontal.replace('#4B2417','#FFF1CF')),
  'logo-stacked.svg':svg('0 0 453 430',picture(0,0,453,302)+`<g transform="translate(0 300)">${words}</g>`),
  'wordmark.svg':wordmark
};
for(const [name,content] of Object.entries(compositions))await fs.writeFile(path.join(output,name),content);
// Exact retired filenames owned by this generator; the original artwork is never modified.
for(const name of ['mark-mono.svg','logo-mono.svg'])await fs.rm(path.join(output,name),{force:true});
const svgAssets=Object.keys(compositions).map(name=>({
  path:`assets/brand/${name}`,representation:name==='wordmark.svg'?'vector':'hybrid-original-raster',
  ...(name==='wordmark.svg'?{}:{embeddedRaster:variants[2].path,sourceRasterSha256:hash(raster),embeddedFormat:'png',embeddedSha256:hash(embeddedPNG)})
}));
await fs.writeFile(path.join(root,'brand-manifest.json'),JSON.stringify({version:2,source:'sources/brand/manifest.json',variants,svgAssets},null,2)+'\n');
console.log(JSON.stringify({brandSVGs:svgAssets.length,brandWebPs:variants.length,originalIdentity:provenance.originalSha256}));
