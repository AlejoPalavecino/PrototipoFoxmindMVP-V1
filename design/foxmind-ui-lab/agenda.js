/* Personal agenda, synthetic 2026 dates. Calendar selection is shared by its three views. */
const agendaWeekdays=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const agendaTypes=['Personal','Clase','Estudio'];
const agendaDate=(month=calendarMonth,day=selectedDay)=>new Date(2026,month,day,12);
const agendaKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function agendaParse(value){
 if(!/^2026-\d{2}-\d{2}$/.test(value||''))return null;
 const [year,month,day]=value.split('-').map(Number),date=agendaDate(month-1,day);
 return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}
const agendaEvents=date=>date.getFullYear()!==2026?[]:state.events.filter(e=>(e.month??10)===date.getMonth()&&e.day===date.getDate()).sort((a,b)=>a.time.localeCompare(b.time)||a.title.localeCompare(b.title,'es'));
const agendaLongDate=date=>date.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
const agendaEventCount=n=>`${n} ${n===1?'evento':'eventos'}`;
function agendaWeek(){const date=agendaDate(),start=selectedDay-(date.getDay()+6)%7;return Array.from({length:7},(_,i)=>agendaDate(calendarMonth,start+i));}
function agendaShift(direction){
 let date;
 if(calendarView==='month'){const month=calendarMonth+direction;if(month<0||month>11)return;date=agendaDate(month,Math.min(selectedDay,agendaDate(month+1,0).getDate()));}
 else date=agendaDate(calendarMonth,selectedDay+direction*(calendarView==='week'?7:1));
 date=new Date(Math.max(agendaDate(0,1).getTime(),Math.min(agendaDate(11,31).getTime(),date.getTime())));
 agendaSelect(agendaKey(date),false);$(`[data-action="${direction<0?'month-prev':'month-next'}"]`)?.focus({preventScroll:true});
}
function agendaSelect(key,reveal=true){
 const date=agendaParse(key);if(!date)return;
 selectedDay=date.getDate();calendarMonth=date.getMonth();const y=window.scrollY;render();
 if(reveal&&calendarView==='month'&&matchMedia('(max-width:1050px)').matches){$('#agenda-day-title')?.focus({preventScroll:true});$('#agenda-day-panel')?.scrollIntoView({block:'start',behavior:'instant'});}
 else {window.scrollTo(0,y);$(`[data-action=calendar-day][data-date="${key}"]`)?.focus({preventScroll:true});}
}
function agendaPaper(date){return `<span class="agenda-paper" aria-hidden="true"><span>${calendarMonths[date.getMonth()].slice(0,3)}</span><b>${date.getDate()}</b></span>`;}
function agendaEventCard(e){
 return `<li class="agenda-entry"><div class="agenda-entry-time"><time>${esc(e.time)}</time><span>${esc(e.end)}</span></div><button class="agenda-event event-${eventTone(e)}" data-action="event-detail" data-id="${e.id}" aria-label="Ver ${esc(e.title)}, de ${esc(e.time)} a ${esc(e.end)}"><span class="agenda-event-meta"><span>${icon(eventIcon(e))}${esc(e.type)}</span><small>${eventDuration(e)}</small></span><b>${esc(e.title)}</b>${e.note?.trim()?`<span class="agenda-event-note">${esc(e.note)}</span>`:''}${icon('chevron','agenda-event-arrow')}</button></li>`;
}
function agendaEmpty(date){return `<div class="agenda-open-space"><span>${icon('calendar')}</span><h3>Un espacio para vos</h3><p>No hay eventos para este día. Podés reservar un rato para ${role==='docente'?'preparar una clase':'repasar'}, organizarte o hacer una pausa.</p>${btn('Agregar un evento','agenda-add-date','','plus',`data-date="${agendaKey(date)}"`)}</div>`;}
function agendaDayPanel(){const date=agendaDate(),items=agendaEvents(date);return `<aside class="agenda-day-panel" id="agenda-day-panel" aria-labelledby="agenda-day-title"><header>${agendaPaper(date)}<div><p>Tu día, a simple vista</p><h2 id="agenda-day-title" tabindex="-1">${date.toLocaleDateString('es-AR',{weekday:'long'})} ${selectedDay}</h2><span>${calendarMonths[calendarMonth]} · ${agendaEventCount(items.length)}</span></div></header><div class="agenda-day-body">${items.length?`<ol class="agenda-itinerary">${items.map(agendaEventCard).join('')}</ol>${btn('Agregar para este día','new-event','agenda-add full','plus')}`:agendaEmpty(date)}<p class="agenda-private">${icon('lock')} Tus eventos son personales.</p></div></aside>`;}
function agendaMonth(){
 const offset=(agendaDate(calendarMonth,1).getDay()+6)%7;
 return `<div class="agenda-month-weekdays" aria-hidden="true">${agendaWeekdays.map(d=>`<span>${d}</span>`).join('')}</div><div class="agenda-month-grid" aria-label="Días de ${calendarMonths[calendarMonth]}">${Array.from({length:42},(_,i)=>{
  const date=agendaDate(calendarMonth,i-offset+1),items=agendaEvents(date),key=agendaKey(date),selected=key===agendaKey(agendaDate()),outside=date.getMonth()!==calendarMonth;
  return `<button class="agenda-cell ${outside?'outside':''} ${i%7>4?'weekend':''}" data-action="calendar-day" data-date="${key}" data-day="${date.getDate()}" aria-pressed="${selected}" ${date.getFullYear()!==2026?'disabled':''} aria-label="${agendaLongDate(date)}, ${agendaEventCount(items.length)}${items.length?': '+esc(items.map(e=>e.time+' '+e.title).join('; ')):''}"><span class="agenda-cell-day">${date.getDate()}</span><span class="agenda-cell-events">${items.slice(0,2).map(e=>`<span class="agenda-cell-event event-${eventTone(e)}"><time>${esc(e.time)}</time><span>${esc(e.title)}</span></span>`).join('')}${items.length>2?`<small>+${items.length-2} más</small>`:''}</span><span class="agenda-cell-dots" aria-hidden="true">${items.slice(0,3).map(e=>`<i class="event-${eventTone(e)}"></i>`).join('')}${items.length>3?`<small>+${items.length-3}</small>`:''}</span></button>`;
 }).join('')}</div><p class="agenda-calendar-hint">${icon('info')} Elegí un día para ver sus eventos completos.</p>`;
}
function agendaWeekStrip(){return `<nav class="agenda-week-strip" aria-label="Elegir día de la semana">${agendaWeek().map((d,i)=>`<button data-action="agenda-week-day" data-date="${agendaKey(d)}" aria-pressed="${d.getMonth()===calendarMonth&&d.getDate()===selectedDay}" ${d.getFullYear()!==2026?'disabled':''}><span>${agendaWeekdays[i]}</span><b>${d.getDate()}</b><small>${agendaEvents(d).length||'—'}</small></button>`).join('')}</nav>`;}
function agendaWeekView(){return agendaWeekStrip()+`<div class="agenda-week-list">${agendaWeek().filter(d=>d.getFullYear()===2026&&(agendaEvents(d).length||agendaKey(d)===agendaKey(agendaDate()))).map(d=>{const items=agendaEvents(d);return `<section class="agenda-week-group" id="agenda-week-${agendaKey(d)}"><header><span>${d.toLocaleDateString('es-AR',{weekday:'long'})}</span><h3>${d.getDate()} <small>${calendarMonths[d.getMonth()].slice(0,3)}</small></h3><button class="icon-button" data-action="agenda-add-date" data-date="${agendaKey(d)}" aria-label="Crear evento para ${agendaLongDate(d)}">${icon('plus')}</button></header>${items.length?`<ol class="agenda-itinerary">${items.map(agendaEventCard).join('')}</ol>`:'<p class="agenda-week-free">Este día está libre. Usá + para reservar un momento.</p>'}</section>`;}).join('')}</div>`;}
function agendaDayView(){const date=agendaDate(),items=agendaEvents(date);return agendaWeekStrip()+`<section class="agenda-day-focus"><header>${agendaPaper(date)}<div><h3>${agendaLongDate(date)}</h3><p>${agendaEventCount(items.length)} ${items.length?'para organizarte a tu ritmo.':'en tu agenda.'}</p></div>${btn('Agregar','new-event','','plus')}</header>${items.length?`<ol class="agenda-itinerary">${items.map(agendaEventCard).join('')}</ol>`:agendaEmpty(date)}</section>`;}
function agendaScreen(){
 const date=agendaDate(),week=agendaWeek(),period=calendarView==='month'?`${calendarMonths[calendarMonth]} <span>2026</span>`:calendarView==='week'?`${week[0].getDate()} ${calendarMonths[week[0].getMonth()].slice(0,3).toLowerCase()} — ${week[6].getDate()} ${calendarMonths[week[6].getMonth()].slice(0,3).toLowerCase()}`:agendaLongDate(date);
 const bounds=calendarView==='month'?[calendarMonth===0,calendarMonth===11]:[agendaKey(date)==='2026-01-01',agendaKey(date)==='2026-12-31'];
 const periodLabel=calendarView==='month'?'mes':calendarView==='week'?'semana':'día';
 return `<div class="agenda-page"><header class="agenda-heading"><div><div class="agenda-heading-icon">${icon('calendar')}</div><div><h1 tabindex="-1">Mi agenda</h1><p>${role==='docente'?'Tus clases, tus ideas y un momento para vos.':'Un lugar para tus clases, repasos y pausas.'}</p></div></div>${btn('Crear evento','new-event','primary','plus')}</header><div class="agenda-layout ${calendarView==='month'?'with-day':''}"><section class="agenda-board" aria-labelledby="agenda-period"><header class="agenda-board-head"><div class="agenda-period-nav"><button class="icon-button" data-action="month-prev" aria-label="${periodLabel} anterior" ${bounds[0]?'disabled':''}>${icon('back')}</button><h2 id="agenda-period" aria-live="polite">${period}</h2><button class="icon-button" data-action="month-next" aria-label="${periodLabel} siguiente" ${bounds[1]?'disabled':''}>${icon('arrow')}</button></div><div class="agenda-views" aria-label="Vista de agenda">${[['month','Mes'],['week','Semana'],['day','Día']].map(([v,label])=>`<button data-action="calendar-view" data-value="${v}" aria-pressed="${v===calendarView}">${label}</button>`).join('')}</div></header><div class="agenda-context"><span>${icon('lock')} Agenda personal</span><button class="text-button" data-action="calendar-today" aria-label="Volver al 13 de noviembre, fecha del ejemplo">${icon('calendar')}13 nov <small>· fecha de ejemplo</small></button></div>${calendarView==='month'?agendaMonth():calendarView==='week'?agendaWeekView():agendaDayView()}</section>${calendarView==='month'?agendaDayPanel():''}</div></div>`;
}
