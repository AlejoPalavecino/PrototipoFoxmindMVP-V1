import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFName, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

async function renderer(){const api=await import("../resource-pdf.ts");assert.equal(typeof api.renderFoxyTextPdf,'function');return api.renderFoxyTextPdf;}
async function render(input,signal=new AbortController().signal){return (await renderer())(input,signal);}
async function inspect(bytes){
  const document=await PDFDocument.load(bytes), strings=[];
  for(const page of document.getPages()){
    const value=page.node.get(PDFName.of('Contents')), entries=value instanceof PDFArray?value.asArray():[value];
    for(const ref of entries){const stream=document.context.lookup(ref);if(!(stream instanceof PDFRawStream))continue;
      const decoded=Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
      for(const match of decoded.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/gu)) strings.push(new TextDecoder('windows-1252').decode(Buffer.from(match[1],'hex')));
    }
    assert.equal(page.node.get(PDFName.of('Annots')),undefined,'no external links or actions');
  }
  return {document,text:strings.join(' ')};
}

test('renders a legible synthetic multi-page PDF preserving Spanish content and digest',async()=>{
  const phrases=Array.from({length:220},(_,i)=>`Línea ${String(i).padStart(3,'0')} — educación, acción, pingüino, niño y ¿por qué?`);
  const result=await render({title:'Guía de revisión',markdown:phrases.join('\n')});
  assert.ok(result.bytes instanceof Uint8Array);assert.equal(result.digest,createHash('sha256').update(result.bytes).digest('hex'));
  assert.ok(Number.isSafeInteger(result.pageCount) && result.pageCount>1);assert.equal(typeof result.rendererVersion,'string');assert.ok(result.rendererVersion.length>0);
  const {document,text}=await inspect(result.bytes);assert.equal(document.getPageCount(),result.pageCount);
  for(const phrase of phrases)assert.ok(text.includes(phrase),phrase);
  assert.equal(document.catalog.get(PDFName.of('OpenAction')),undefined);assert.equal(document.catalog.get(PDFName.of('AA')),undefined);
});

test('long lines wrap without truncating or reordering text',async()=>{
  const words=Array.from({length:600},(_,i)=>`palabra${String(i).padStart(3,'0')}`),result=await render({title:'Extensión',markdown:words.join(' ')});
  const {text}=await inspect(result.bytes);let offset=0;
  for(const word of words){const index=text.indexOf(word,offset);assert.ok(index>=offset,word);offset=index+word.length;}
});

test('unsupported glyphs and over-limit or invalid resource input fail closed',async()=>{
  await renderer();
  for(const input of [{title:'Emoji 😀',markdown:'Texto'},{title:'Título',markdown:'Texto 😀'},
    {title:'x'.repeat(201),markdown:'Texto'},{title:'Título',markdown:'x'.repeat(50001)},{title:'',markdown:'Texto'},
    {title:'Título',markdown:'Texto\u0001'}]) await assert.rejects(render(input));
});

test('abort prevents returning PDF',async()=>{
  await renderer();
  const controller=new AbortController();controller.abort();await assert.rejects(render({title:'Título',markdown:'Texto'},controller.signal));
});

test('renderer snapshots reviewed input before async work despite immediate caller mutation',async()=>{
  const fn=await renderer(),input={title:'Título revisado',markdown:'Contenido docente revisado'};
  const pending=fn(input,new AbortController().signal);
  input.title='Título alterado';input.markdown='X'.repeat(60000);
  const result=await pending,{text}=await inspect(result.bytes);
  assert.ok(text.includes('Título revisado'));assert.ok(text.includes('Contenido docente revisado'));
  assert.equal(text.includes('Título alterado'),false);assert.equal(text.includes('X'.repeat(100)),false);
  assert.equal(result.digest,createHash('sha256').update(result.bytes).digest('hex'));
});

test('rejects more than 100 pages even when content remains below character limit',async()=>{
  const fn=await renderer(), input={title:'Resumen',markdown:Array.from({length:5100},()=> 'x').join('\n')};
  assert.ok([...input.markdown].length<=50000);
  await assert.rejects(fn(input,new AbortController().signal),error=>error?.code==='AI_INPUT_LIMIT');
});

test('long content within 100 pages returns a complete PDF',async()=>{
  const input={title:'Resumen',markdown:Array.from({length:4000},(_,i)=>`Línea ${i}`).join('\n')};
  assert.ok([...input.markdown].length<=50000);const result=await render(input);
  assert.ok(result.pageCount<=100);const {document,text}=await inspect(result.bytes);assert.equal(document.getPageCount(),result.pageCount);
  assert.ok(text.includes('Línea 0'));assert.ok(text.includes('Línea 3999'));
});

test('same reviewed resource produces identical PDF bytes and digest after clock advances',async t=>{
  const fn=await renderer();t.mock.timers.enable({apis:['Date'],now:Date.UTC(2026,9,31)});
  try {const input={title:'Mismo contenido',markdown:'Español, educación y acción.'};
    const first=await fn(input,new AbortController().signal);t.mock.timers.tick(2000);
    const second=await fn(input,new AbortController().signal);
    assert.equal(first.digest,second.digest);assert.deepEqual(first.bytes,second.bytes);
    const doc=await PDFDocument.load(first.bytes), doc2=await PDFDocument.load(second.bytes);
    assert.equal(doc.getAuthor(),doc2.getAuthor());assert.equal(doc.getCreator(),doc2.getCreator());
    assert.equal(String(doc.getAuthor() ?? '').includes('usuario sintético'),false);
  }finally{t.mock.timers.reset();}
});

test('new reviewed PDFs preserve reading order, semantic headings and readable notation', async () => {
  const markdown = String.raw`### Costo total

- El plan A cuesta **$300 + 50 \times v$**.
- El plan B cobra $80 por viaje.

##### Para repasar

Compará ambos costos.`;
  const result = await render({title:'Planes de viaje',markdown});
  const {document,text} = await inspect(result.bytes);
  assert.equal(result.rendererVersion,'foxy-pdf-v2');
  assert.equal(document.getTitle(),'Planes de viaje');
  assert.match(text,/Planes de viaje Costo total .*300 \+ 50 × v.*cobra \$80.*Para repasar Compará/u);
  assert.doesNotMatch(text,/\*\*|# Costo|\\times/);
  const root = document.catalog.lookup(PDFName.of('StructTreeRoot'));
  assert.ok(root);
  const [documentRef] = root.lookup(PDFName.of('K'), PDFArray).asArray();
  const structure = document.context.lookup(documentRef).lookup(PDFName.of('K'), PDFArray).asArray();
  const roles = structure.map(ref => document.context.lookup(ref).get(PDFName.of('S')).toString());
  assert.deepEqual(roles,['/Title','/H1','/L','/H2','/P']);
  assert.equal(document.catalog.get(PDFName.of('Lang')).decodeText(),'es');
});

test('an allocated foxy-pdf-v1 resource still reproduces its original bytes', async () => {
  const fn = await renderer();
  const input = {title:'Guía de revisión',markdown:'# Costo total\n\nUn viaje adicional suma 50 pesos.\n- Plan A'};
  const result = await fn(input, new AbortController().signal,'foxy-pdf-v1');
  assert.equal(result.rendererVersion,'foxy-pdf-v1');
  assert.equal(result.digest,'85aa3980145f0849240e32b3d880203e42f455b3500e857edc381e9632832fa0');
});
