import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyDiagramRenderer } from "../diagram-renderer.ts";
const graph=(title,label)=>({schemaVersion:'foxy-diagram-v1',title,description:'Resumen',direction:'TOP_DOWN',nodes:[{id:'a',label:'Inicio'},{id:'b',label:'Final'}],edges:[{from:'a',to:'b',label}]});
test('renders long valid titles and edge labels without losing distinct suffixes',async()=>{
 const renderer=createFoxyDiagramRenderer();
 for(const aspectRatio of ['1:1','4:3','3:4','16:9']) {
  const request=(suffix)=>({diagram:graph('T'.repeat(59)+suffix,'E'.repeat(39)+suffix),aspectRatio,signal:new AbortController().signal});
  const a=await renderer.render(request('A')),b=await renderer.render(request('B'));
  assert.equal(a.mimeType,'image/png'); assert.notEqual(a.digest,b.digest);
 }
});
