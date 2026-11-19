const lengua = 'Lengua · 2.º B';
const mate = 'Matemática · 2.º B';
const labels = ['Acercarse primero', 'Hacer seguimiento', 'Al día', 'Sin evidencia suficiente'];
const marks = ['!', '●', '✓', '—'];
// Cada fixture representa una inscripción. Las citas son producciones ficticias.
const records = [
  {name:'Tomás Ríos', room:mate, level:0, reason:'Dos entregas vencidas. La más antigua lleva 12 días pendiente.',
   pending:['Problemas de reparto · venció el 6 nov','Proporciones · venció el 13 nov'], done:2, total:4,
   grades:[['Escalas · 28 oct',8],['Mapas · 3 nov',8]],
   points:[[['Relaciona la escala de un plano con distancias reales.',[['Escalas','Expliqué que 1 cm representa 2 metros.'],['Mapas','Multipliqué los 3 cm del plano por 2 metros.']]]],[]],
   action:'Preguntale si pudo empezar Problemas de reparto. Acuerden un primer ejercicio y revisen juntos cómo lo resolvió.'},
  {name:'Lucía Gómez', room:lengua, level:1, reason:'Tiene una entrega pendiente desde hace 5 días.',
   pending:['Crónica breve · venció el 13 nov'], done:2,total:3,grades:[['Reseña del río · 3 nov',7],['Reseña del viaje · 9 nov',8]],
   points:[[['Expresa su opinión desde el inicio de sus reseñas.',[['Reseña del río','Me gustó el final porque cambia lo que pensábamos del río.'],['Reseña del viaje','Para mí el viaje es lo mejor del cuento.']]]],
   [['Le falta explicar cómo el ejemplo sostiene su opinión.',[['Reseña del río','Por ejemplo, vuelven al puente.'],['Reseña del viaje','Por ejemplo, encuentran el mapa.']]]]],
   action:'Invitala a completar «Este ejemplo apoya mi idea porque…». Revisen una reseña y comprueben si queda clara la relación.'},
  {name:'Lucía Gómez', room:mate, level:2, reason:'Entregó las tres actividades obligatorias del período.',done:3,total:3,
   grades:[['Escalas · 28 oct',8],['Mapas · 3 nov',9],['Proporciones · 13 nov',9]], points:[[],[]],
   action:'Proponé un problema nuevo y revisen si puede explicar cómo eligió la operación.'},
  {name:'Pilar Solís',room:lengua,level:2,reason:'Entregó las dos actividades. Una espera corrección.',done:2,total:2,
   grades:[['Reseña del río · 3 nov',7]],points:[[],[]],action:'Revisá la segunda entrega antes de identificar una tendencia.'},
  {name:'Nico Vera',room:lengua,level:3,reason:'Ingresó esta semana. Aún no tuvo entregas con vencimiento.',done:0,total:0,
   grades:[],points:[[],[]],action:'Revisen juntos la consigna de la primera actividad.'}
];
const byId = id => document.getElementById(id);
const room = byId('room');
const dialog = document.querySelector('dialog');
let section = 'home';
let expanded = false;
let homeRoom = 'Todas las aulas';
let classRoom = lengua;
let trigger;

function badge(level) {
  return '<span class="pill tone s'+level+'">'+marks[level]+' '+labels[level]+'</span>';
}
function render() {
  const home = section === 'home';
  const selected = records.filter(item => room.selectedIndex === 0 || item.room === room.value)
    .sort((a,b) => a.level-b.level || a.name.localeCompare(b.name,'es'));
  byId('heading').textContent = home ? 'Inicio docente' : room.value;
  byId('title').textContent = home ? 'Prioridad de acompañamiento' : 'Estudiantes';
  byId('subtitle').textContent = home ? 'Estudiantes de tus aulas activas, ordenados por prioridad.' : 'Elegí una ficha para ver cómo acompañar a cada estudiante.';
  for (const view of ['home','classroom']) {
    if (section === view) byId(view).setAttribute('aria-current','page');
    else byId(view).removeAttribute('aria-current');
  }
  byId('counts').innerHTML = labels.map((label,i) => '<div class="count tone s'+i+'"><b>'+selected.filter(s => s.level===i).length+'</b>'+label+'</div>').join('');
  const visible = home && !expanded ? selected.slice(0,3) : selected;
  byId('rows').innerHTML = visible.map(item => '<li><span class="avatar" aria-hidden="true">'+item.name.split(' ').map(n=>n[0]).join('')+'</span><div><strong class="rowname">'+item.name+'</strong><div class="meta">'+item.room+'</div>'+badge(item.level)+'<p class="reason">'+item.reason+'</p></div><button data-id="'+records.indexOf(item)+'" aria-label="Ver ficha de '+item.name+', '+item.room+'">Ver ficha</button></li>').join('');
  byId('more').hidden = !home || selected.length<=3;
  byId('more').textContent = expanded ? 'Ver menos' : 'Ver todos ('+selected.length+')';
}
function navigate(view) {
  section = view;
  room.options[0].disabled = view==='classroom';
  room.value = view==='home' ? homeRoom : classRoom;
  render();
}
const submissions = {
  'Reseña del río':['Escribí tu opinión sobre el final y justificá tu lectura con un ejemplo.','Me gustó el final porque cambia lo que pensábamos del río. Por ejemplo, vuelven al puente.'],
  'Reseña del viaje':['Elegí un aspecto del cuento y explicá cómo un ejemplo apoya tu opinión.','Para mí el viaje es lo mejor del cuento. Por ejemplo, encuentran el mapa.'],
  'Escalas':['Explicá qué significa la escala del plano.','Expliqué que 1 cm representa 2 metros.'],
  'Mapas':['Calculá la distancia real entre los puntos A y B.','Multipliqué los 3 cm del plano por 2 metros. La distancia es de 6 metros.']
};
function submissionEvidence(activity,quote) {
  const [prompt,answer] = submissions[activity];
  return '<blockquote><strong>'+activity+'</strong><br>«'+quote+'»<details><summary>Abrir entrega</summary><p><b>Consigna</b><br>'+prompt+'</p><p><b>Texto entregado</b><br>'+answer+'</p></details></blockquote>';
}
function pointsList(title,items) {
  const points = items.map(([text,sources]) => '<li>'+text+
    '<details><summary>Ver evidencia ('+sources.length+')</summary>'+sources.map(([activity,quote])=>
      submissionEvidence(activity,quote)).join('')+'</details></li>').join('');
  return '<section><h3>'+title+'</h3>'+(points ? '<ul>'+points+'</ul>' : '<p class="empty">Todavía falta evidencia para señalar un punto.</p>')+'</section>';
}
function openRecord(button) {
  const item = records[Number(button.dataset.id)];
  const grades = item.grades;
  const avg = grades.length ? (grades.reduce((sum,g)=>sum+g[1],0)/grades.length).toLocaleString('es-AR',{maximumFractionDigits:2}) : 'Sin notas';
  const chart = grades.length>1 ? '<section><h3>Notas publicadas</h3>'+grades.map(([activity,grade])=>'<div class="barrow"><span>'+activity+'</span><span class="track" aria-hidden="true"><i style="width:'+grade*10+'%"></i></span><b>'+grade+'</b></div>').join('')+'</section>' : '';
  trigger = button;
  byId('person').textContent=item.name;
  byId('context').textContent=item.room+' · 18 nov 2026';
  byId('detail').innerHTML='<section>'+badge(item.level)+'<p>'+item.reason+'</p>'+
    (item.pending ? '<details><summary>Ver pendientes</summary><ul>'+item.pending.map(p=>'<li>'+p+'</li>').join('')+'</ul></details>' : '')+'</section>'+
    '<section class="metricgrid"><div>Promedio individual<strong>'+avg+'</strong>'+grades.length+(grades.length===1?' actividad con nota':' actividades con nota')+(grades.length===1?' · '+grades[0][0]:'')+'</div><div>Entregas obligatorias<strong>'+(item.total?item.done+' de '+item.total:'Sin vencimientos')+'</strong>Obligatorias del período</div></section>'+
    chart+'<div class="points">'+pointsList('Puntos fuertes',item.points[0])+pointsList('Aspectos a reforzar',item.points[1])+'</div>'+
    '<section class="suggestion"><h3>Qué podés probar</h3><p>'+item.action+'</p></section>';
  dialog.showModal();
  dialog.scrollTop=0;
  byId('close').focus();
}
byId('rows').onclick = event => {const button=event.target.closest('button[data-id]'); if(button) openRecord(button);};
byId('close').onclick = () => dialog.close();
dialog.onclose = () => trigger.focus({preventScroll:true});
byId('home').onclick = () => navigate('home');
byId('classroom').onclick = () => navigate('classroom');
room.onchange = () => {
  if(section==='home') {homeRoom=room.value; expanded=false;} else classRoom=room.value;
  render();
};
byId('more').onclick = () => {expanded=!expanded; render();};
render();
