/** Deterministic provider for the isolated browser QA harness. Never calls AI services. */
export const studyPreviewProvider = {
  async generate(input) {
    const context = JSON.parse(input.prompt);
    const privateSource = context.action==='CHAT' && context.sources?.find(item=>
      /^Adjunto de QA/u.test(item.title) && input.documents?.some(document=>document.sourceRef.id===item.id));
    const source = privateSource || context.sources?.[0];
    if (!source) return {status:'INSUFFICIENT',title:'QA sintética: faltan fuentes',markdown:'',sourceRefs:[],missingInformation:['Agregá un documento legible para ejecutar la prueba sintética.']};
    const sourceRefs=[{id:source.id,version:source.version}];
    const base={status:'COMPLETE',title:'QA sintética: estudio de la luz',markdown:'Contenido sintético para verificar la interfaz. La exposición acumula luz durante un intervalo; una mayor apertura permite más entrada de luz. Revisá la fuente indicada.',sourceRefs,missingInformation:[]};
    if(context.action==='PLAN')return {...base,title:'QA sintética: plan organizado',units:[{title:'La luz',topics:['Exposición','Contraste']},{title:'Práctica fotográfica',topics:['Apertura y tiempo de exposición']}]};
    if(['QUIZ','EXERCISE','MOCK_EXAM'].includes(context.action)){
      const count=context.questionCount??5;
      if(!Number.isInteger(count)||count<1||count>30||!context.topics?.length)throw new Error('Invalid synthetic study practice input');
      const questions=Array.from({length:count},(_,index)=>{
        const topic=context.topics[index%context.topics.length],type=['SINGLE','MULTIPLE','DEVELOPMENT'][index%3];
        const common={id:`synthetic-question-${index+1}`,topicId:topic.id,type,scoringRule:'EXACT',sourceRefs,explanation:'Devolución sintética de QA: la exposición depende de la luz recibida durante el intervalo y de la apertura.'};
        if(type==='DEVELOPMENT')return {...common,prompt:`QA sintética ${index+1}: explicá con tus palabras cómo se relacionan luz, apertura y exposición.`,options:[],correctOptionIds:[]};
        const options=[{id:'light',text:'Una mayor apertura permite más entrada de luz.'},{id:'time',text:'El tiempo de exposición influye en la luz acumulada.'},{id:'unrelated',text:'La luz acumulada no cambia con la apertura ni con el tiempo.'}];
        return {...common,prompt:`QA sintética ${index+1}: ${type==='MULTIPLE'?'seleccioná las dos afirmaciones correctas':'seleccioná la afirmación sobre apertura'}.`,options,correctOptionIds:type==='MULTIPLE'?['light','time']:['light']};
      });
      return {...base,title:`QA sintética: ${context.action==='QUIZ'?'Quiz':context.action==='EXERCISE'?'Ejercicios':'Simulacro'}`,practice:{title:'Práctica sintética de luz y exposición',questions}};
    }
    if(context.action==='OUTLINE')return {...base,title:'QA sintética: esquema de estudio',markdown:'## Esquema sintético de QA\n- Luz\n  - Exposición: luz acumulada durante un intervalo.\n  - Apertura: regula la entrada de luz.\n- Contraste: diferencia entre zonas claras y oscuras.'};
    if(context.action==='NOTE')return {...base,title:'QA sintética: apunte editable',markdown:'## Apunte sintético de QA\nLa exposición describe la luz acumulada durante un intervalo. Para estudiar, compará una imagen con apertura mayor con otra de apertura menor y explicá el efecto esperado. Este texto es una salida determinista de prueba, no una respuesta de un proveedor real.'};
    const feedback=String(context.message).startsWith('Da devolución orientativa');
    return {...base,title:feedback?'QA sintética: devolución orientativa':'QA sintética: conversación',markdown:feedback?'Devolución orientativa sintética para QA: identificaste la relación entre luz y exposición. Podés mejorar la respuesta explicando cómo intervienen la apertura y el tiempo. No es una nota oficial ni una respuesta de un proveedor real.':privateSource?'Documento privado recibido por el proveedor sintético.':base.markdown};
  }
};
