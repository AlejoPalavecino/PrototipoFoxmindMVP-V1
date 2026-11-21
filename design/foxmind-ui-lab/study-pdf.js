async function notePdf(c){
  await document.fonts.ready;
  const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(c.title);pdf.setAuthor('FoxMind');
  pdf.registerFontkit(fontkit);
  const [regular,heavy]=await Promise.all(FOX_PDF_FONTS.map(face=>pdf.embedFont(face,{subset:true})));
  const blocks=creationBlocks(c),glyphs=new Set(regular.getCharacterSet());
  const selectable=Array.from(c.title+c.body).every(v=>/\s/u.test(v)||glyphs.has(v.codePointAt(0)));
  const width=595,height=842,margin=44;
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
  const ctx=canvas.getContext('2d');ctx.scale(2,2);
  const logo=new Image();logo.src=ASSETS.logo;await logo.decode();
  await document.fonts.load('900 72px Nunito');
  const stamp=document.createElement('canvas');stamp.width=570;stamp.height=132;
  const brand=stamp.getContext('2d'),imageHeight=116,imageWidth=imageHeight*logo.naturalWidth/logo.naturalHeight;
  brand.drawImage(logo,0,6,imageWidth,imageHeight);brand.font='900 76px Nunito';brand.fillStyle='#233549';
  const labelX=imageWidth+12;brand.fillText('Fox',labelX,91);brand.fillStyle='#b94e13';brand.fillText('Mind',labelX+brand.measureText('Fox').width,91);
  const mark=await pdf.embedPng(stamp.toDataURL());
  const rgb=hex=>PDFLib.rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
  let y,page;
  function rect(x,top,w,h,color){
    if(selectable)page.drawRectangle({x,y:height-top-h,width:w,height:h,color:rgb(color)});
    else{ctx.fillStyle=color;ctx.fillRect(x,top,w,h)}
  }
  function text(value,x,baseline,size,bold,color){
    if(selectable)page.drawText(value,{x,y:height-baseline,size,font:bold?heavy:regular,color:rgb(color)});
    else{ctx.font=(bold?'bold ':'')+size+'px Nunito';ctx.fillStyle=color;ctx.fillText(value,x,baseline)}
  }
  function measure(value,size,bold){
    if(selectable)return (bold?heavy:regular).widthOfTextAtSize(value,size);
    ctx.font=(bold?'bold ':'')+size+'px Nunito';return ctx.measureText(value).width;
  }
  async function endPage(){if(!selectable){const pic=await pdf.embedPng(canvas.toDataURL());page.drawImage(pic,{x:0,y:0,width,height})}}
  function startPage(){
    page=pdf.addPage([width,height]);rect(0,0,width,height,'#ffffff');
    const first=pdf.getPageCount()===1,scale=first?0.25:0.18,top=first?30:20;
    if(selectable)page.drawImage(mark,{x:margin,y:height-top-stamp.height*scale,width:stamp.width*scale,height:stamp.height*scale});
    else ctx.drawImage(stamp,margin,top,stamp.width*scale,stamp.height*scale);
    if(first)text(resultLabels[resultKind(c)]?.[0]||'Material de estudio',margin,94,11,true,'#865029');
    text(String(pdf.getPageCount()),width-margin-8,819,10,false,'#485563');y=first?130:78;
  }
  async function space(h){if(y+h>786){await endPage();startPage()}}
  async function write(runs,size,heading=false,title=false){
    const start=margin;let x=start+(!heading&&!title&&!/^\d+[.)]\s/.test(runs[0]?.text||'')?13:0);
    const lineHeight=size*1.55;
    await space(lineHeight*(heading?2:1));
    if(heading)y+=5;
    for(const run of runs){
      const bold=title||heading||run.bold,color=inkColors[run.color]||inkColors.ink;
      let buffer='';
      const flush=()=>{if(buffer){text(buffer,x,y,size,bold,color);x+=measure(buffer,size,bold);buffer=''}};
      const newline=async()=>{flush();y+=lineHeight;await space(lineHeight);x=start};
      for(let token of run.text.split(/(\s+)/u).filter(Boolean)){
        if(/^\s+$/.test(token))token=' ';
        if(x+measure(buffer+token,size,bold)>width-margin&&(buffer||x>start))await newline();
        if(token===' '&&!buffer&&x===start)continue;
        if(measure(token,size,bold)>width-2*margin-12){
          for(const ch of token){if(x+measure(buffer+ch,size,bold)>width-margin)await newline();buffer+=ch}
        }else buffer+=token;
      }
      flush();
    }
    y+=lineHeight+(heading?1:7);
  }
  startPage();await write([{text:c.title}],26,false,true);
  if(c.mitosisDemo){await space(26);text('Biología · División celular',margin,y,10,false,'#43695a');y+=26}
  async function cellFigure(stages){
    const captions=['Profase','Metafase','Anafase','Telofase'];
    await space(104);
    const column=(width-2*margin)/stages.length,artWidth=Math.min(105,column-18),artHeight=artWidth*212/320;
    rect(margin,y-5,width-2*margin,artHeight+24,'#eff5f1');
    for(const [i,stage] of stages.entries()){
      const cell=document.createElement('canvas');cell.width=320;cell.height=212;drawMitosisCell(cell,stage);
      const mid=margin+column*(i+0.5),x=mid-artWidth/2;
      if(selectable){const pic=await pdf.embedPng(cell.toDataURL());page.drawImage(pic,{x,y:height-y-artHeight,width:artWidth,height:artHeight})}
      else ctx.drawImage(cell,x,y,artWidth,artHeight);
      text(captions[stage],mid-measure(captions[stage],10,true)/2,y+artHeight+12,10,true,'#315e50');
    }
    y+=artHeight+42;
  }
  if(c.mitosisDemo&&c.kind==='explain')await cellFigure([1,2]);
  let illustrated=false;
  for(const block of blocks){
    await write(block.runs,block.heading?15:11.5,block.heading);
    if(!illustrated&&c.mitosisDemo&&c.kind==='notes'&&block.heading&&/cuatro fases/i.test(block.runs.map(r=>r.text).join(''))){
      await cellFigure([0,1,2,3]);illustrated=true;
    }
  }
  if(c.mitosisDemo&&c.kind==='explain'){
    await write([{text:'Ponete a prueba'}],16,true);
    await write([{text:'¿Qué pasaría si ambas copias fueran al mismo polo?'}],12);
    await write([{text:'Los futuros núcleos recibirían cantidades desiguales de ese cromosoma.'}],12);
  }
  await endPage();return pdf.save();
}
