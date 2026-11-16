/* One editor for create/edit; draft stays in the dialog until a successful save. */
let agendaEventDraft=null,agendaEventInitial='',agendaFormReturnFocus=null;
const agendaFormSignature=v=>JSON.stringify(['title','date','time','end','type','color','note'].map(key=>v[key]||''));
function agendaEventValues(id){const e=state.events.find(e=>e.id===id),date=view==='inicio'?agendaDate(10,13):agendaDate();return {title:e?.title||'',date:e?agendaKey(agendaDate(e.month??10,e.day)):agendaKey(date),time:e?.time||'16:00',end:e?.end||'16:30',type:e?.type||'Personal',color:eventTone(e||{}),note:e?.note||''};}
function agendaPreview(values){const date=agendaParse(values.date),duration=eventDuration(values);return `<div class="agenda-live-card event-${eventTone(values)}"><span class="agenda-live-type">${icon(eventIcon(values))}${esc(values.type)}</span><h3>${esc(values.title.trim()||'Tu próximo evento')}</h3><p>${icon('calendar')}${date?agendaLongDate(date):'Elegí una fecha'}</p><div class="agenda-live-time">${icon('clock')}<b>${esc(values.time||'—')} <span>a</span> ${esc(values.end||'—')}</b>${duration?`<small>${duration}</small>`:''}</div><span class="agenda-live-color"><i></i>${eventColors[eventTone(values)]}</span></div>`;}
function eventColorFields(ev){return `<fieldset class="agenda-color-field"><legend>Color del evento</legend><div class="event-color-options">${Object.entries(eventColors).map(([key,label])=>`<label class="event-color-option event-${key}"><input type="radio" name="color" value="${key}" ${eventTone(ev)===key?'checked':''}><span class="color-swatch" aria-hidden="true">${icon('check')}</span><span>${label}</span></label>`).join('')}</div></fieldset>`;}
function eventForm(id=null,restore=null){
 eventEditing=id;agendaEventDraft=restore?{...restore}:agendaEventValues(id);if(!restore){agendaEventInitial=agendaFormSignature(agendaEventDraft);agendaFormReturnFocus=null;}
 const v=agendaEventDraft;
 showDialog(id?'Editar evento':'Un momento en tu agenda','Elegí cuándo y cómo querés reconocerlo.',`<form id="event-form" data-form="agenda-event" novalidate><div class="agenda-editor-grid"><div class="agenda-fields"><div><label for="f-title">Nombre del evento</label><input id="f-title" name="title" value="${esc(v.title)}" required maxlength="100" placeholder="Por ejemplo: repasar exposición"></div><fieldset class="agenda-type-field"><legend>¿Qué vas a hacer?</legend><div class="agenda-type-options">${agendaTypes.map(type=>`<label><input type="radio" name="type" value="${type}" ${v.type===type?'checked':''}>${icon(eventIcon({type}))}<span>${type}</span></label>`).join('')}</div></fieldset><div class="agenda-date-fields"><div><label for="f-date">Fecha</label><input id="f-date" name="date" type="date" value="${esc(v.date)}" min="2026-01-01" max="2026-12-31" required></div><div><label for="f-time">Desde</label><input id="f-time" name="time" type="time" value="${esc(v.time)}" required></div><div><label for="f-end">Hasta</label><input id="f-end" name="end" type="time" value="${esc(v.end)}" required></div></div><p class="agenda-zone">${icon('clock')} Horario de Buenos Aires (UTC−3)</p>${eventColorFields(v)}<div><label for="event-note">Algo para recordar <span>(opcional)</span></label><textarea id="event-note" name="note" rows="2" maxlength="1000" placeholder="Materiales, una idea o un recordatorio…">${esc(v.note)}</textarea></div><p id="event-error" class="notice error" role="alert" hidden></p></div><aside class="agenda-form-preview" aria-label="Vista previa del evento"><p>Así se verá en tu agenda</p><div id="agenda-live-preview">${agendaPreview(v)}</div><p class="agenda-private">${icon('lock')} Este evento es para vos. No cambia las actividades ni sus fechas de entrega.</p></aside></div></form>`,btn('Cancelar','agenda-cancel')+`<button type="submit" form="event-form" class="button primary">${icon('check')}${id?'Guardar cambios':'Crear evento'}</button>`,true);
 $('#dialog').className='agenda-form-dialog';
}
function updateEventPreview(){const form=$('#event-form');if(!form||form.dataset.form!=='agenda-event')return;agendaEventDraft=Object.fromEntries(new FormData(form));$('#agenda-live-preview').innerHTML=agendaPreview(agendaEventDraft);}
function agendaCloseForm(){
 updateEventPreview();if(agendaFormSignature(agendaEventDraft)===agendaEventInitial){agendaExitForm();return;}
 agendaFormReturnFocus=document.activeElement?.id||'f-title';
 showDialog('¿Descartás los cambios?','El evento conserva su versión anterior hasta que guardes.',`<div class="agenda-discard-summary">${icon('edit')}<p>${esc(agendaEventDraft.title.trim()||'Tu nuevo evento')}<small>Tenés cambios sin guardar.</small></p></div>`,btn('Seguir editando','agenda-keep-editing')+btn('Descartar cambios','agenda-discard','danger'));
 $('#dialog').classList.add('agenda-discard-dialog');
}
function agendaExitForm(){const id=eventEditing;agendaEventDraft=null;if(id&&state.events.some(e=>e.id===id))eventDetail(id);else closeDialog();}
function agendaFormError(message,field){const error=$('#event-error');error.hidden=false;error.textContent=message;if(field){const el=$(`[name="${field}"]`);(el?.closest('.agenda-date-fields')||el?.parentElement)?.after(error);el?.setAttribute('aria-invalid','true');el?.setAttribute('aria-describedby','event-error');el?.focus();}else{$('.agenda-fields')?.prepend(error);error.tabIndex=-1;error.focus();}error.scrollIntoView({block:'nearest',behavior:'instant'});}
function agendaSaveEvent(){
 const form=$('#event-form');if(!form)return;updateEventPreview();const v=agendaEventDraft,date=agendaParse(v.date);
 if(!v.title.trim())return agendaFormError('Escribí un nombre para reconocer el evento.','title');
 if(v.title.length>100)return agendaFormError('Usá hasta 100 caracteres para el nombre.','title');
 if(!date)return agendaFormError('Elegí una fecha válida de 2026 para esta maqueta.','date');
 if(!/^\d{2}:\d{2}$/.test(v.time)||!form.elements.time.validity.valid)return agendaFormError('Indicá a qué hora empieza.','time');
 if(!/^\d{2}:\d{2}$/.test(v.end)||!form.elements.end.validity.valid||v.end<=v.time)return agendaFormError('La hora de finalización debe ser posterior al inicio.','end');
 if(v.note.length>1000)return agendaFormError('Usá hasta 1000 caracteres en el recordatorio.','note');
 const previous=state.events,previousNext=state.eventNext,id=eventEditing||state.eventNext,wasEditing=!!eventEditing;
 if(wasEditing&&!previous.some(e=>e.id===id))return agendaFormError('Este evento ya no está disponible. Volvé a la agenda.');
 const event={...v,title:v.title.trim(),note:v.note.trim(),type:agendaTypes.includes(v.type)?v.type:'Personal',color:eventTone(v),id,month:date.getMonth(),day:date.getDate()};
 state.events=wasEditing?previous.map(e=>e.id===id?event:e):[...previous,event];if(!wasEditing)state.eventNext++;
 if(!save()){state.events=previous;state.eventNext=previousNext;return agendaFormError('No pudimos guardar el evento. Tus cambios siguen acá; podés volver a intentar.');}
 agendaEventDraft=null;selectedDay=event.day;calendarMonth=event.month;closeDialog();render();$(`[data-action=event-detail][data-id="${id}"]`)?.focus({preventScroll:true});toast(wasEditing?'Guardaste los cambios del evento.':'Tu evento ya está en la agenda.','success');
}
function eventDetail(id){
 eventEditing=id;agendaEventDraft=null;const e=state.events.find(x=>x.id===id);if(!e)return;
 showDialog('Tu evento','',`<div class="agenda-detail-card event-${eventTone(e)}"><div class="agenda-detail-type">${icon(eventIcon(e))}${esc(e.type)}<span>${eventDuration(e)}</span></div><h3>${esc(e.title)}</h3><div class="agenda-detail-when">${agendaPaper(agendaDate(e.month??10,e.day))}<div><b>${agendaLongDate(agendaDate(e.month??10,e.day))}</b><p>${esc(e.time)} a ${esc(e.end)}</p></div></div></div><div class="agenda-detail-note"><h4>${icon('edit')} Para recordar</h4><p>${esc(e.note||'No agregaste un recordatorio para este evento.')}</p></div><p class="agenda-private">${icon('lock')} Personal · Horario de Buenos Aires (UTC−3)</p>`,btn('Eliminar','delete-event','danger','trash')+btn('Editar evento','edit-event','primary','edit'));
 $('#dialog').className='agenda-detail-dialog';
}
function agendaDeleteConfirm(){const e=state.events.find(x=>x.id===eventEditing);if(!e)return;showDialog('¿Eliminar este evento?','Se quitará de tu agenda personal.',`<div class="agenda-discard-summary">${icon('calendar')}<p><b>${esc(e.title)}</b><small>${agendaLongDate(agendaDate(e.month??10,e.day))} · ${esc(e.time)}</small></p></div><p id="agenda-delete-error" class="notice error" role="alert" hidden></p>`,btn('Conservar evento','agenda-back-detail')+btn('Eliminar evento','confirm-delete-event','danger','trash'));$('#dialog').classList.add('agenda-delete-dialog');}
function agendaDeleteEvent(){const previous=state.events;state.events=previous.filter(e=>e.id!==eventEditing);if(!save()){state.events=previous;const error=$('#agenda-delete-error');error.hidden=false;error.textContent='No pudimos eliminar el evento. Sigue en tu agenda; podés reintentar.';return;}closeDialog();render();toast('Eliminaste el evento de tu agenda.','success');$('[data-action=new-event]')?.focus({preventScroll:true});}
function installAgenda(){
 const oldClose=actions.close;
 Object.assign(actions,{
  'calendar-view':b=>{calendarView=b.dataset.value;render();$(`[data-action=calendar-view][data-value="${calendarView}"]`)?.focus({preventScroll:true});},
  'calendar-day':b=>agendaSelect(b.dataset.date||agendaKey(agendaDate(calendarMonth,Number(b.dataset.day)))),
  'calendar-today':()=>agendaSelect('2026-11-13',false),
  'month-prev':()=>agendaShift(-1),'month-next':()=>agendaShift(1),
  'agenda-week-day':b=>{const date=agendaParse(b.dataset.date);if(!date)return;selectedDay=date.getDate();calendarMonth=date.getMonth();render();if(calendarView==='week'){$('#agenda-week-'+b.dataset.date)?.scrollIntoView({block:'center',behavior:'instant'});}$(`[data-action=agenda-week-day][data-date="${b.dataset.date}"]`)?.focus({preventScroll:true});},
  'agenda-add-date':b=>{const date=agendaParse(b.dataset.date);if(date){selectedDay=date.getDate();calendarMonth=date.getMonth();eventForm();}},
  'new-event':()=>eventForm(),'edit-event':()=>eventForm(eventEditing),'event-detail':b=>eventDetail(Number(b.dataset.id)),
  'agenda-cancel':agendaCloseForm,'agenda-discard':agendaExitForm,
  'agenda-keep-editing':()=>{eventForm(eventEditing,agendaEventDraft);$('#'+agendaFormReturnFocus)?.focus();},
  'delete-event':agendaDeleteConfirm,'confirm-delete-event':agendaDeleteEvent,'agenda-back-detail':()=>eventDetail(eventEditing),
  close:()=>{if($('#dialog').classList.contains('agenda-form-dialog'))agendaCloseForm();else if($('#dialog').classList.contains('agenda-discard-dialog'))actions['agenda-keep-editing']();else if($('#dialog').classList.contains('agenda-delete-dialog'))eventDetail(eventEditing);else oldClose();}
 });
 document.addEventListener('submit',e=>{if(e.target.dataset.form==='agenda-event'){e.preventDefault();e.stopImmediatePropagation();agendaSaveEvent();}},true);
 document.addEventListener('input',e=>{if(!e.target.closest('#event-form'))return;e.target.removeAttribute('aria-invalid');const error=$('#event-error');if(error)error.hidden=true;});
 document.addEventListener('change',e=>{if(e.target.closest('#event-form'))updateEventPreview();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#dialog').open&&/agenda-(form|discard|delete)-dialog/.test($('#dialog').className)){e.preventDefault();e.stopImmediatePropagation();actions.close();}},true);
 document.addEventListener('keydown',e=>{const cell=e.target.closest('.agenda-cell');if(!cell)return;const shifts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(!(e.key in shifts))return;e.preventDefault();const date=agendaParse(cell.dataset.date);date.setDate(date.getDate()+shifts[e.key]);if(date.getFullYear()===2026)agendaSelect(agendaKey(date),false);});
}
