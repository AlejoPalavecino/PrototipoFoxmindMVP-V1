// Illustrative outputs share the Biology material used in the quiz and diagram.
const exampleSections = {
  explain:['Entender un tema','¿Por qué se separan las cromátidas?', 'Imaginá dos juegos iguales de instrucciones. Antes de la mitosis la célula ya hizo la copia. Durante la anafase reparte un juego hacia cada polo.', 'Para comprobarlo','Si las dos copias quedaran del mismo lado, ¿recibirían ambos núcleos las mismas instrucciones?'],
  notes:['Preparar un apunte','Mitosis en cuatro fases','Antes de empezar, el ADN ya se duplicó. La mitosis organiza y separa las copias para formar dos núcleos.', 'Secuencia','Profase: los cromosomas se condensan. Metafase: se alinean. Anafase: las cromátidas se separan. Telofase: se forman dos núcleos.'],
  map:['Conectar ideas','Las fases de la mitosis'],
  image:['Crear una imagen','Cromosomas en metafase'],
  practice:['Practicar','Quiz de mitosis'],
  exercise:['Crear ejercicios','Ordená los acontecimientos','Escribí en orden: separación de cromátidas, condensación de cromosomas y alineación en el centro.', 'Respuesta de referencia','Condensación → alineación → separación. La posición de los cromosomas permite distinguir cada fase.'],
  exam:['Preparar una evaluación','Simulacro de mitosis','1. ¿Qué ocurrió con el ADN antes de la profase? 2. Describí una señal para distinguir metafase y anafase.', 'Orientación al finalizar','El ADN ya se duplicó. En metafase los cromosomas se alinean en el centro; en anafase las cromátidas se separan. Contrastá ambas ideas con tu respuesta.'],
  plan:['Organizar mi repaso','Dos sesiones de repaso','Hoy · 10 minutos. Dibujá las cuatro fases y nombrá un cambio en cada una.', 'Mañana · 5 minutos','Reconstruí la secuencia de memoria y explicá la transición de metafase a anafase.'],
  activity:['Crear una actividad','El recorrido de un cromosoma','En parejas, dibujen dos células: una en metafase y otra en anafase. Usen flechas para indicar qué cambia.', 'Entrega y criterio','Entreguen los dibujos con una explicación de dos frases. Se revisará si distinguen alineación y separación.'],
  lesson:['Planificar una clase','Una clase sobre división celular','Inicio · 5 min. Recuperar qué ocurre con el ADN antes de la división.', 'Desarrollo y cierre','Desarrollo · 20 min. Comparar dibujos de metafase y anafase. Cierre · 5 min. Cada estudiante justifica a qué fase pertenece una imagen.'],
  rubric:['Pensar una rúbrica','Cómo revisar los dibujos','Criterio: distinción entre alineación y separación.', 'Niveles de logro','Logrado: representa y explica ambos cambios. En proceso: dibuja las fases pero explica sólo una. Para revisar: ubica la separación en metafase.']
};

const demoPrompts={
  explain:'Explicame qué pasa con las cromátidas en anafase.',
  notes:'Prepará un apunte breve para repasar las cuatro fases de la mitosis.',
  map:'Mostrame qué cambia entre metafase y anafase.',
  practice:'Tomame dos preguntas sobre la mitosis y explicame mis errores.',
  exam:'Prepará una evaluación de repaso sobre división celular.',
  activity:'Prepará una actividad en parejas para comparar metafase y anafase.',
  lesson:'Planificá una clase de 30 minutos sobre división celular.',
  rubric:'Proponé criterios para evaluar los dibujos de metafase y anafase.'
};
function demoBrief(kind){return fxThread().mitosisDemo?demoPrompts[kind]||'Describí lo que querés preparar.':'Describí lo que querés preparar con estos temas.'}
function prepareDemoConversation(force=false){
  if(role==='estudiante'&&fxFolder()?.id!=='folder-original-2')return;
  const thread=fxThreads().find(t=>t.mitosisDemo);
  if(thread){if(force)fxCommit(()=>state.foxySpace.active[fxScope()]=thread.id);return}
  const t=fxNewThreadData({classId:role==='docente'?'bio':'',topicIds:[],sourceIds:[]});
  t.title=role==='docente'?'Clase sobre división celular':'Repasando mitosis';t.mitosisDemo=true;
  t.messages=[
    {id:fxId('message'),who:'user',text:role==='docente'?'Quiero trabajar la mitosis con el curso. Les cuesta distinguir metafase y anafase.':'Estoy repasando mitosis. ¿Cómo reconozco la metafase?'},
    {id:fxId('message'),who:'assistant',text:'En metafase, los cromosomas están alineados en el centro. En anafase, las cromátidas hermanas se separan hacia polos opuestos.'}
  ];
  fxCommit(()=>{state.foxySpace.threads.unshift(t);state.foxySpace.active[fxScope()]=t.id});
}
function prepareDemoCreation(c){
  const key=c.kind==='map'&&c.format==='image'?'image':c.kind;
  const sample=exampleSections[key];if(!sample)return;
  c.mitosisDemo=true;c.title=sample[1];
  if(key==='exam')c.body='Respondé tres preguntas sobre mitosis. Podés revisar tus elecciones antes de finalizar y leer la orientación al terminar.';
  else c.body=mitosisLessons[key]||sample.slice(2).join('\n\n')||mitosisSource;
  if(['activity','notes','explain','lesson','rubric'].includes(key)){
    const focus=c.topics.includes('Duplicación del ADN')?'duplicación':c.topics.includes('Metafase y anafase')?'separación':'secuencia';
    const cues={
      duplicación:['Antes de la profase','El ADN se copia durante la interfase. Al empezar la profase, cada cromosoma ya tiene dos cromátidas hermanas.','Un alumno dibuja un cromosoma que se duplica en anafase. Pedile que ubique la copia en la línea de tiempo y explique cuándo se separa.'],
      separación:['Una pista para distinguir las fases','En metafase, buscá la alineación en el centro. Para identificar anafase, buscá dos grupos que empiezan a alejarse.','Mostrá dos dibujos sin rótulos. Pedí al grupo que elija cuál representa anafase y justifique la elección con una evidencia visible.'],
      secuencia:['Reconstruir el recorrido','Ordená cuatro dibujos y explicá con un verbo cada cambio: condensar, alinear, separar y reorganizar.','Repartí cuatro dibujos desordenados. Cada pareja debe ordenarlos y justificar una de las tres transiciones.']
    };
    const [title,student,teacher]=cues[focus];
    if(key==='notes'&&role==='estudiante'){
      const prompts={duplicación:'Alguien afirma que el ADN se duplica en anafase. ¿Qué le responderías? Ubicá la duplicación y la separación en una línea de tiempo.',separación:'Compará un dibujo de metafase con uno de anafase. Marcá con flechas qué estructuras se separan y hacia dónde se desplazan.',secuencia:'Cubrí los nombres de las fases. Intentá reconstruirlas a partir de los cambios que ves en los cromosomas.'};
      c.body=c.body.split('## Para repasar')[0]+'## Para repasar\n'+prompts[focus];return;
    }
    c.body+='\n\n## '+(role==='docente'?'Intervención en el aula':title)+'\n'+(role==='docente'?teacher:student);
  }
}
function demoRequestSummary(c){
  return `<div class="fx-scope-banner">${icon('chat')}<div><b>Tu pedido</b><p>${esc(c.brief)}</p><small>${esc(c.topics.join(' · '))}</small></div></div>`;
}
function activeDemoCreation(){
  const id=new URLSearchParams(location.hash.split('?')[1]).get('creation');
  return id?fxOwnedCreation(id):null;
}
function openDemoCreation(c){
  if(!c.mitosisDemo||!(c.kind==='practice'||(c.kind==='map'&&c.format==='diagram')))return false;
  const key=c.kind==='practice'?0:1;
  const path=mitosisRoute(mitosisTabs[key]);
  const phase=/anafase/i.test(c.brief+' '+c.topics.join(' '))?3:0;
  c.readerState??={step:0,answers:[],review:0,prompts:mitosisQuestions.map(q=>q.prompt),studentPhase:phase,teacherPhase:phase,reveal:false};
  mitosisState=c.readerState;save();
  if($('#dialog').open)closeDialog();
  location.hash=path+(path.includes('?')?'&':'?')+'creation='+encodeURIComponent(c.id);
  return true;
}
function installDemoChat(){
  actions['demo-back']=()=>go(view);
  actions['demo-chat']=()=>{
    if($('#dialog').open)closeDialog();
    const path=role==='estudiante'?'#estudiante/estudio?folder=folder-original-2':'#docente/foxy';
    history.pushState(null,'',path);render();prepareDemoConversation(true);render();
  };
}
