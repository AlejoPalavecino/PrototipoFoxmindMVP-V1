const resultLabels={
  explain:['Explicación','Leer explicación','book'],notes:['Apunte','Leer apunte','file'],
  practice:['Quiz','Abrir quiz','play'],exam:['Simulacro','Abrir simulacro','flag'],
  map:['Esquema interactivo','Explorar esquema','layers'],image:['Ilustración','Ver imagen','spark'],
  activity:['Actividad','Revisar actividad','edit'],lesson:['Plan de clase','Ver clase','calendar'],
  rubric:['Rúbrica','Revisar criterios','chart'],'study-plan':['Plan de repaso','Ver mis sesiones','calendar']
};
const mitosisLessons={
  explain:`Antes de la mitosis, cada cromosoma ya tiene dos copias de su ADN. En la anafase esas copias se separan para que cada futuro núcleo reciba un juego completo.

## Mirá qué cambia
En metafase, las cromátidas hermanas siguen unidas y los cromosomas están alineados en el centro. En anafase, las cromátidas se mueven hacia polos opuestos.

## Un ejemplo
Pensá en dos juegos idénticos de instrucciones. Primero hacés las copias; después, repartís un juego para cada lado. La anafase corresponde al reparto.`,
  notes:`Antes de dividirse, la célula duplica su ADN. Durante la mitosis, distribuye esas copias de modo que cada núcleo reciba un juego completo.

## Cómo reconocer las cuatro fases
1. Profase. Los cromosomas se condensan y se distinguen.
2. Metafase. Los cromosomas se alinean en el centro de la célula.
3. Anafase. Las cromátidas hermanas se separan hacia polos opuestos.
4. Telofase. Se forman dos núcleos y los cromosomas se descondensan.

## ¿Cuándo se duplica el ADN?
La duplicación del ADN ocurre antes de la mitosis. La separación de sus copias ocurre durante la anafase. La citocinesis divide el citoplasma.

## Para repasar
Dibujá una célula en metafase y otra en anafase. Señalá qué cambió de posición y qué estructuras dejaron de estar unidas.`,
  activity:`## Consigna
En parejas, dibujen una célula en metafase y otra en anafase. Usen el mismo color para identificar el recorrido de una cromátida.

## Entrega
Presenten los dibujos con dos frases: ¿qué se observa en el centro?, ¿qué cambia al pasar a anafase?

## Qué se va a revisar
La ubicación de los cromosomas, la separación de las cromátidas y la relación entre el dibujo y la explicación.`,
  lesson:`## Inicio · 5 minutos
Mostrá una célula en metafase. Preguntá en qué momento se duplicó el ADN y recuperá las hipótesis del grupo.

## Desarrollo · 20 minutos
En parejas, comparen metafase y anafase. Marquen con flechas el movimiento y justifiquen qué fase representa cada dibujo.

## Cierre · 5 minutos
Cada estudiante explica con una oración la diferencia entre duplicar el ADN y separar sus copias.`,
  rubric:`Criterio: distinguir metafase y anafase mediante el dibujo y la explicación.

## Logrado
Representa los cromosomas alineados y luego las cromátidas separándose. Explica la transición usando ambos dibujos.

## En proceso
Reconoce ambas fases y ubica los cromosomas, pero necesita precisar qué estructuras se separan.

## Para revisar
Intercambia las fases o ubica la duplicación del ADN en anafase. Conviene volver a comparar las dos imágenes.`
};
function resultKind(c){return c.kind==='map'&&c.format==='image'?'image':c.kind}
function resultCard(id){
  const c=fxOwnedCreation(id);if(!c)return '';
  const [type,action,symbol]=resultLabels[resultKind(c)]||['Recurso','Ver recurso','file'];
  const descriptions={
    explain:'Compará las dos células y comprobá cómo se reparten las copias del ADN.',
    notes:'Las cuatro fases, una distinción clave y una consigna para repasar.',
    practice:'Dos preguntas con una explicación después de cada respuesta.',
    exam:'Tres preguntas para responder antes de revisar el simulacro.',
    map:'Tocá una fase o una flecha para explorar qué cambia.',
    image:'Observá la posición de los cromosomas en metafase.',
    activity:'Una consigna en parejas, la entrega esperada y qué revisar.',
    lesson:'Una clase de 30 minutos con apertura, comparación de dibujos y cierre.',
    rubric:'Tres niveles para revisar cómo se representan y explican las fases.'
  };
  const detail=c.mitosisDemo&&descriptions[resultKind(c)]?descriptions[resultKind(c)]:c.kind==='study-plan'?`${c.sessions?.length||0} sesiones`:(c.topics||[]).join(' · ');
  return `<section class="fx-result-card"><span class="fx-tool-icon peach">${icon(symbol)}</span><div><small>${type}</small><h3>${esc(c.title)}</h3>${detail?`<p>${esc(detail)}</p>`:''}</div>${btn(action,'fx-creation','primary','arrow',`data-id="${esc(id)}"`)}</section>`;
}
function resultBody(c){
  const kind=resultKind(c);
  const paragraphs=creationBlocks(c);
  const split=paragraphs.findIndex(b=>b.heading);
  const intro=blocksMarkup(split<0?paragraphs:paragraphs.slice(0,split));
  const groups=[];
  for(const block of split<0?[]:paragraphs.slice(split)){
    if(block.heading)groups.push([]);
    groups.at(-1).push(block);
  }
  const blocks=groups.map(group=>`<section class="fx-result-section">${blocksMarkup(group)}</section>`).join('');
  const visual=kind==='explain'?`<div class="fx-comparison">${[1,2].map((phase,i)=>`<figure><canvas width="320" height="212" data-result-cell="${phase}" aria-hidden="true"></canvas><figcaption>${i?'Anafase · Separación':'Metafase · Alineación'}</figcaption></figure>`).join(icon('arrow'))}</div>`:'';
  const check=kind==='explain'?`<section class="mit-challenge">${img('logo','mit-mascot')}<div><b>Ponete a prueba</b><h3>¿Qué pasaría si ambas copias fueran al mismo polo?</h3><p id="fx-explain-answer" hidden>Los futuros núcleos recibirían cantidades desiguales de ese cromosoma.</p></div>${btn('Ver respuesta','fx-explain-answer','primary')}</section>`:'';
  return `<div class="fx-result-body">${intro}${visual}${blocks}${check}</div>`;
}
function noteDownloads(){return btn('Descargar PDF','fx-note-pdf','','download')+btn('Descargar Word','fx-note-word','','download')}
async function exportNote(format){
  const c=fxOwnedCreation(fxEditing);if(!c)return;
  try{
    const word=format==='docx';
    const bytes=word?(await import(RESOURCE_WORD_MODULE)).createResourceDocument(c.title,c.body):await notePdf(c);
    const mime=word?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf';
    const url=URL.createObjectURL(new Blob([bytes],{type:mime})),a=document.createElement('a');
    a.href=url;a.download=(c.title.replace(/[\\/:*?"<>|]/g,' ').slice(0,100)||'Apunte')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch{toast('No pudimos preparar el archivo. Volvé a intentarlo.','error')}
}
function installResultReaders(){
  actions['fx-note-pdf']=()=>exportNote('pdf');actions['fx-note-word']=()=>exportNote('docx');
  actions['fx-explain-answer']=b=>{const answer=$('#fx-explain-answer');answer.hidden=!answer.hidden;b.textContent=answer.hidden?'Ver respuesta':'Ocultar respuesta';b.setAttribute('aria-expanded',String(!answer.hidden))};
}
