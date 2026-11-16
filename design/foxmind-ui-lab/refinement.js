/* Iteration 2: a warmer welcome and a calendar that exposes its content. */
function welcomePanel(mode){
  const teacher=mode==='teacher',study=mode==='study';
  const title=teacher?'Las buenas ideas empiezan acá.':study?'Dale espacio a tu curiosidad.':'Aprender tiene su propia aventura.';
  const copy=teacher?'Prepará tu próxima clase con Foxy. Vos le das tu mirada.':study?'Tus materiales, tus preguntas y un compañero para conectar las ideas.':'Un tema, una pregunta, un descubrimiento. Retomá desde donde te quedaste.';
  const c=classroom(),pending=studentPending()[0];
  return `<section class="welcome-v2 ${teacher?'teacher':'student'} ${study?'study':''}">
    <div class="welcome-v2-copy"><span class="welcome-label">${icon(teacher?'spark':'book')}${teacher?'Tu espacio para enseñar':study?'Sólo para vos':'Un paso más, a tu ritmo'}</span>
      <h2>${title}</h2><p>${copy}</p><div class="welcome-actions">${teacher?btn('Preparar con Foxy','open-foxy','primary','spark'):study?btn('Crear mi carpeta','new-folder','primary','plus'):btn('Continuar actividad','continue-first','primary','arrow')}</div>
      <div class="welcome-context">${icon(study?'lock':teacher?'users':'clock')}<span>${study?'Tu estudio es personal. Tus ideas también.':teacher?`${esc(c.name)} · ${esc(c.group)}`:pending?`Próxima entrega · ${esc(pending.due)}`:'Tus actividades están al día.'}</span></div>
    </div>
    <div class="welcome-scene" aria-hidden="true"><div class="scene-disc"></div><div class="scene-orbit"></div><div class="scene-spark spark-one">${icon('spark')}</div><div class="scene-spark spark-two">${icon('plus')}</div>
      <div class="idea-paper"><span>${icon('book')}</span><i></i><i></i><i></i></div><div class="idea-pencil"></div>${img('foxy','scene-fox')}
      <div class="scene-caption">${icon('spark')} Una idea lleva a otra</div>
    </div>
  </section>`;
}
const calendarMonths=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const eventColors={blue:'Azul',green:'Verde',orange:'Naranja',rose:'Rosa',violet:'Violeta',slate:'Pizarra'};
const eventTone=e=>Object.hasOwn(eventColors,e.color)?e.color:e.type==='Clase'?'blue':e.type==='Estudio'?'green':'orange';
const eventIcon=e=>e.type==='Clase'?'book':e.type==='Estudio'?'spark':'calendar';
function scheduleItem(e){return `<button class="schedule-item event-${eventTone(e)}" data-action="event-detail" data-id="${e.id}"><time>${esc(e.time)}<span>${esc(e.end)}</span></time><span class="schedule-marker">${icon(eventIcon(e))}</span><span class="schedule-copy"><b>${esc(e.title)}</b><small>${esc(e.type)}</small></span>${icon('chevron','schedule-chevron')}</button>`;}
