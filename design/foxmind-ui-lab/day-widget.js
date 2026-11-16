/* The home agenda shares event data and actions with the full calendar. */
function eventDuration(e){
 const minutes=value=>{const [h,m]=String(value||'').split(':').map(Number);return h*60+m;},duration=minutes(e.end)-minutes(e.time);
 if(!Number.isFinite(duration)||duration<=0)return '';
 const hours=Math.floor(duration/60),rest=duration%60;return hours?`${hours} h${rest?' '+rest+' min':''}`:`${rest} min`;
}
function homeDayEvent(e){
 const duration=eventDuration(e);
 return `<li class="planner-event"><div class="planner-hours"><time>${esc(e.time)}</time><span>a ${esc(e.end)}</span></div><button class="planner-event-card event-${eventTone(e)}" data-action="event-detail" data-id="${e.id}" aria-label="Ver evento ${esc(e.title)}, de ${esc(e.time)} a ${esc(e.end)}"><span class="planner-event-meta"><span>${icon(eventIcon(e))}${esc(e.type)}</span>${duration?`<small>${duration}</small>`:''}</span><b>${esc(e.title)}</b>${icon('chevron','planner-event-arrow')}</button></li>`;
}
function homeDayWidget(events){
 return `<section class="panel today-widget home-today day-planner" aria-labelledby="day-planner-title"><header class="planner-header"><div class="planner-title"><h2 id="day-planner-title">Tu día, con calma</h2>${link('Ver agenda','agenda','arrow','text-button')}</div><div class="planner-date"><div class="planner-paper" aria-hidden="true"><span>Noviembre</span><b>13</b></div><div class="planner-date-copy"><h3>Viernes 13 de noviembre</h3><p>${events.length?`${events.length} ${events.length===1?'evento':'eventos'} en tu día`:'Un día con espacio para vos'}</p></div><span class="planner-spark" aria-hidden="true">${icon('spark')}</span></div></header>
 <div class="planner-content"><nav class="planner-week" aria-label="Abrir un día en la agenda">${['Lun','Mar','Mié','Jue','Vie'].map((name,i)=>{const day=i+9,items=state.events.filter(e=>e.day===day&&(e.month??10)===10);return `<button class="${day===13?'is-reference':''}" data-action="home-day" data-day="${day}" aria-label="Ver agenda del ${day} de noviembre, ${items.length} ${items.length===1?'evento':'eventos'}"><span>${name}</span><b>${day}</b><i class="${items.length?'has-events':''}" aria-hidden="true"></i></button>`;}).join('')}</nav>
 <ol class="home-day-events planner-events" aria-label="Eventos del 13 de noviembre">${events.map(homeDayEvent).join('')}</ol>${events.length?'':`<div class="planner-empty">${icon('calendar')}<h3>Un espacio para lo que te gusta.</h3><p>Agendá un repaso, una idea o un momento para vos.</p></div>`}<div class="day-footer planner-footer">${btn('Crear un evento','new-event','full','plus')}</div></div></section>`;
}
