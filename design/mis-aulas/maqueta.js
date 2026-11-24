/* Maqueta navegable de Mis aulas en dirección Expedición. Datos sintéticos; textos tomados de la app. */
const PUB = '../../apps/web/public';
const ICON = `${PUB}/foxmind-3d/icons/sprite.svg`;
const $ = (s, r = document) => r.querySelector(s);
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="${ICON}#${n}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cover = (key, size = 640) => `${PUB}/foxmind-3d/covers/${key}-${size}.webp`;

const COVERS = [['literature', 'Literatura'], ['math', 'Matemática'], ['biology', 'Biología'], ['society', 'Sociedad'], ['science', 'Ciencia y tecnología'], ['creative', 'Arte y creatividad'], ['general', 'General']];
const PLAN = [
  { name: 'La célula', topics: [['Qué es una célula', 'done'], ['Partes de la célula', 'done'], ['Célula animal y vegetal', 'now'], ['Microscopio y observación', '']] },
  { name: 'Nutrición de las plantas', topics: [['Fotosíntesis', ''], ['Respiración celular', ''], ['Transporte de nutrientes', '']] },
];
const state = {
  role: 'teacher', archived: false, empty: false, notes: false,
  listTab: 'activas', query: '', dialog: null, toast: null, landing: null,
  rooms: [
    { id: 'bio', name: 'Biología 3.° B', subject: 'Biología', division: '3.° B', cover: 'biology', students: 24, taught: 9, total: 14, review: 3 },
    { id: 'foto', name: 'Fotografía y luz', subject: 'Fotografía', division: '5.° A', cover: 'creative', students: 18, taught: 6, total: 14, review: 2 },
    { id: 'lit', name: 'Literatura 5.° A', subject: 'Literatura', division: '5.° A', cover: 'literature', students: 27, taught: 2, total: 14, review: 0 },
    { id: 'hist', name: 'Historia 2025', subject: 'Historia', division: '4.° C', cover: 'society', students: 22, taught: 14, total: 14, review: 0, archived: true },
  ],
  drafts: [{ id: 'd1', name: 'Química orgánica', subject: 'Química', division: '6.° A', step: 2 }],
  materials: [
    { title: 'Guía: partes de la célula', ext: 'pdf', use: 'Material de estudio', where: 'La célula · Partes de la célula', size: '1,8 MB', links: 2 },
    { title: 'Presentación del microscopio', ext: 'ppt', use: 'Recomendado', where: 'La célula · Microscopio y observación', size: '6,2 MB', links: 0 },
    { title: 'Fotos de células al microscopio', ext: 'img', use: 'Material complementario', where: 'La célula', size: '3,4 MB', links: 1 },
  ],
  activities: [
    { title: 'Cuestionario: partes de la célula', type: 'Cuestionario', status: 'shared', due: '27 nov, 23:59', subs: 12, studentState: 'Para empezar' },
    { title: 'Informe: observación al microscopio', type: 'Trabajo práctico', status: 'shared', due: 'Sin fecha límite', subs: 5, studentState: 'Borrador guardado' },
    { title: 'Evaluación: la célula', type: 'Evaluación', status: 'draft', due: '4 dic, 10:00', subs: 0, studentState: 'Devolución publicada' },
  ],
  editor: null, wz: null,
};
const STUDENTS = [['Ada Lovelace', 'high', 3, 4, 7.5], ['Bruno Díaz', 'mid', 4, 4, 8.2], ['Carla Méndez', 'low', 4, 4, 9.1], ['Diego Ruiz', 'mid', 2, 4, null], ['Elena Torres', 'low', 4, 4, 8.8]];

/* ---------- Navegación ---------- */
const route = () => (location.hash.slice(2).split('?')[0] || 'aulas').split('/');
const go = h => { if (location.hash === `#/${h}`) render(); else location.hash = `#/${h}`; };
const tabsFor = role => role === 'teacher'
  ? [['plan', 'Plan', 'book'], ['muro', 'Muro', 'chat'], ['biblioteca', 'Biblioteca', 'folder'], ['actividades', 'Actividades', 'clipboard'], ['progreso', 'Progreso', 'progress'], ['estudiantes', 'Estudiantes', 'users'], ['historial', 'Historial', 'clock'], ['ajustes', 'Ajustes', 'settings']]
  : [['plan', 'Plan', 'book'], ['muro', 'Muro', 'chat'], ['biblioteca', 'Biblioteca', 'folder'], ['actividades', 'Actividades', 'clipboard'], ['mi-progreso', 'Mi progreso', 'progress'], ['companeros', 'Compañeros', 'users']];
const JUMPS = () => {
  const t = state.role === 'teacher';
  const base = [['Mis aulas', [['aulas', 'Lista de aulas'], ...(t ? [['aulas?borradores', 'Borradores'], ['crear/1', 'Crear aula · paso 1'], ['crear/2', 'Crear aula · paso 2 (programa)'], ['crear/3', 'Crear aula · paso 3 (recorrido)'], ['crear/4', 'Crear aula · paso 4 (todo listo)']] : [['aulas?unirme', 'Unirme con código']])]]];
  const room = ['Dentro del aula', tabsFor(state.role).map(([id, label]) => [`aula/bio/${id}`, label])];
  const flows = ['Flujos', t ? [['aula/bio/biblioteca?subir', 'Subir material'], ['aula/bio/actividades/nueva', 'Crear actividad (manual)'], ['aula/bio/actividades/nueva?foxy', 'Crear actividad con Foxy'], ['aula/bio/estudiantes?invitar', 'Invitar estudiantes'], ['aula/bio/ajustes?archivar', 'Archivar aula']] : [['aula/bio/companeros?salir', 'Salir del aula']]];
  return [...base, room, flows];
};

function render() {
  const [view, a, b, c] = route();
  const [path, flag] = location.hash.slice(2).split('?');
  if (flag && !state.consumed?.[location.hash]) {
    state.consumed = { ...state.consumed, [location.hash]: true };
    if (flag === 'borradores') state.listTab = 'borradores';
    if (flag === 'unirme') state.dialog = { kind: 'join', code: '' };
    if (flag === 'subir') state.dialog = { kind: 'upload', step: 0 };
    if (flag === 'invitar') state.dialog = { kind: 'invite', phase: 'compose' };
    if (flag === 'archivar') state.dialog = { kind: 'archive' };
    if (flag === 'salir') state.dialog = { kind: 'leave' };
    if (flag === 'foxy') state.editor = newEditor(true);
  }
  const teacher = state.role === 'teacher';
  $('[data-nav]').innerHTML = [['home', 'Inicio'], ['book', 'Mis aulas', true], ...(teacher ? [] : [['folder', 'Mi estudio']]), ['calendar', 'Agenda'], ['bell', 'Notificaciones']]
    .map(([i, l, cur]) => `<a href="#/aulas" ${cur ? 'aria-current="page"' : ''}>${icon(i)}${l}</a>`).join('');
  $('[data-me]').innerHTML = `<img src="${PUB}/brujula/avatars/${teacher ? 'foxy-classic' : 'foxy-explorer'}.webp" alt=""><span><strong>${teacher ? 'Lucía Demo' : 'Marina Demo'}</strong><small>${teacher ? 'Docente' : 'Estudiante'}</small></span>`;
  document.querySelectorAll('[data-role]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.role === state.role)));
  document.querySelectorAll('[data-toggle]').forEach(btn => btn.setAttribute('aria-pressed', String(state[btn.dataset.toggle])));
  const jump = $('[data-jump]');
  jump.innerHTML = JUMPS().map(([g, items]) => `<optgroup label="${g}">${items.map(([h, l]) => `<option value="${h}" ${h === path ? 'selected' : ''}>${l}</option>`).join('')}</optgroup>`).join('');
  const out = $('[data-view]');
  if (view === 'crear' && teacher) { out.innerHTML = listView(); renderWizard(a); }
  else if (view === 'aula') {
    if (b === 'actividades' && c === 'nueva' && teacher) { state.editor ??= newEditor(false); out.innerHTML = roomView(a, 'actividades'); renderEditor(); }
    else { state.editor = null; $('[data-overlay]').innerHTML = ''; out.innerHTML = roomView(a, b || 'plan'); }
  } else { state.wz = null; $('[data-overlay]').innerHTML = ''; out.innerHTML = listView(); }
  renderDialog();
  renderToast();
}

/* ---------- Mis aulas ---------- */
function roomCard(r, extra = '') {
  const pct = r.total ? Math.round(r.taught / r.total * 100) : 0;
  return `<a class="room ${r.archived ? 'archived' : ''} ${extra}" href="#/aula/${r.id}/plan">
    <span class="cover"><img src="${cover(r.cover)}" alt=""><span class="chip">${esc(r.division)}${r.archived ? ' · Archivada' : ''}</span></span>
    <span class="body"><h3>${esc(r.name)}</h3><span class="meta">${esc(r.subject)}${state.role === 'teacher' ? ` · ${r.students} estudiantes` : ''}</span>
      <span class="plan">${r.total ? `<span>${r.taught} de ${r.total} temas dados</span><span class="trailbar" role="progressbar" aria-label="Avance del plan" aria-valuenow="${r.taught}" aria-valuemax="${r.total}"><i style="width:${pct}%"></i></span>` : '<span>Sin temas</span>'}</span></span></a>`;
}
function listView() {
  const t = state.role === 'teacher';
  const visible = state.rooms.filter(r => t || !r.own);
  const active = state.empty ? [] : visible.filter(r => !r.archived);
  const archived = state.empty ? [] : visible.filter(r => r.archived);
  const drafts = state.empty || !t ? [] : state.drafts;
  const tabs = [['activas', 'Activas', active.length], ['archivadas', 'Archivadas', archived.length], ...(t ? [['borradores', 'Borradores', drafts.length]] : [])];
  if (!t && state.listTab === 'borradores') state.listTab = 'activas';
  const q = state.query.toLowerCase();
  const pick = { activas: active, archivadas: archived, borradores: drafts }[state.listTab].filter(r => !q || `${r.name} ${r.subject} ${r.division}`.toLowerCase().includes(q));
  const empties = {
    search: ['No encontramos esa aula', 'Probá con el nombre, la materia o el grupo.', '<button class="btn secondary" data-act="clear-search">Limpiar búsqueda</button>'],
    borradores: ['Las próximas ideas tienen lugar acá', 'Guardá un aula como borrador y retomá la creación cuando quieras.', ''],
    archivadas: ['Todavía no hay aulas archivadas', 'Las aulas que archives van a seguir disponibles para consultar.', '<button class="btn secondary" data-act="tab" data-tab="activas">Ver aulas activas</button>'],
    activas: t ? ['Tu primera aula empieza con una idea', 'Dale un nombre, prepará el plan e invitá a tu grupo.', '<a class="btn primary" href="#/crear/1">' + icon('plus') + 'Crear aula</a>']
      : ['Tu próximo descubrimiento empieza acá', 'Aceptá una invitación o ingresá el código que te compartió tu docente.', '<button class="btn primary" data-act="join">Unirme con código</button>'],
  };
  const e = empties[q && !pick.length ? 'search' : state.listTab];
  const grid = pick.length ? `<div class="grid">${pick.map(r => state.listTab === 'borradores' ? draftCard(r) : roomCard(r, r.id === state.landing ? 'landing' : '')).join('')}</div>`
    : `<div class="empty"><img src="${PUB}/foxmind/classroom-world.webp" alt=""><h2>${e[0]}</h2><p>${e[1]}</p>${e[2]}</div>`;
  const resume = t && drafts.length && state.listTab !== 'borradores' ? `<div class="notice" style="margin-top:18px">${icon('spark')}<span>Una idea te espera: <b>${esc(drafts[0].name)}</b></span><a class="link" href="#/crear/${drafts[0].step}">Retomar creación${icon('arrow-right')}</a></div>` : '';
  const invite = !t && !state.empty && !state.joinedInvite ? `<section class="invite" aria-labelledby="inv-t"><img src="${PUB}/foxmind/foxy-explorer.webp" alt=""><div><h3 id="inv-t">Te invitaron a aprender Química 5.° A</h3><p>Un nuevo grupo te está esperando. · Pendiente de tu respuesta</p></div><div class="actions"><button class="btn quiet" data-act="decline">Ahora no</button><button class="btn primary" data-act="accept">Aceptar y unirme</button></div></section>` : '';
  return `<section class="hero" aria-labelledby="h-aulas">
      <div><p class="kicker">${t ? 'Un espacio para cada grupo' : 'Tu comunidad para aprender'}</p><h1 id="h-aulas">Mis aulas</h1>
      <p>${t ? 'Las ideas crecen cuando las compartimos. Prepará el próximo encuentro.' : 'Cada aula, una nueva forma de mirar el mundo. ¿Por dónde seguimos?'}</p>
      <div class="actions">${t ? `<a class="btn primary" href="#/crear/1">${icon('plus')}Crear aula</a><span class="tally">${active.length} aulas activas</span>` : `<button class="btn primary" data-act="join">${icon('link')}Unirme con código</button>`}</div></div></section>
    ${invite}${resume}
    <div class="toolbar"><div class="seg-tabs" role="group" aria-label="Filtrar aulas">${tabs.map(([id, l, n]) => `<button type="button" data-act="tab" data-tab="${id}" aria-pressed="${state.listTab === id}">${l}<span class="count">${n}</span></button>`).join('')}</div>
      <label class="search"><span class="sr">Buscar aula</span>${icon('search')}<input class="input" data-search placeholder="Nombre, materia o grupo" value="${esc(state.query)}"></label></div>
    ${grid}`;
}
function draftCard(d) {
  return `<article class="room draft"><span class="cover"><img src="${PUB}/foxmind/foxy-creative.webp" alt=""></span><span class="body">
    <span class="chip orange">Pendiente de creación</span><h3>${esc(d.name || 'Tu próxima aula')}</h3><span class="meta">${esc(d.subject)} · ${esc(d.division)}</span>
    <span class="dots" aria-label="Paso ${d.step} de 4">${[1, 2, 3, 4].map(n => `<i class="${n <= d.step ? 'on' : ''}"></i>`).join('')}Paso ${d.step} de 4</span>
    <span class="foot"><a class="btn secondary sm" href="#/crear/${d.step}">Continuar creación</a><button class="icon-btn" data-act="del-draft" aria-label="Eliminar borrador ${esc(d.name)}">${icon('trash')}</button></span></span></article>`;
}

/* ---------- Asistente de creación ---------- */
const WZ_STEPS = [['Tu aula', 'Nombre, grupo y portada'], ['El programa', 'Tu PDF, Word o PowerPoint'], ['El recorrido', 'Unidades y temas'], ['Todo listo', 'Revisá y creá']];
function renderWizard(step) {
  state.wz ??= { name: 'Ciencias naturales', subject: 'Biología', division: '2.° A', year: 2026, cover: 'biology', file: null, scan: 0, method: 'foxy', units: [], fromFoxy: false, dirty: false };
  const wz = state.wz; const n = step === 'procesando' ? 2 : Number(step) || 1;
  const body = { 1: wzGeneral, 2: wzProgram, 3: wzPlan, 4: wzReview }[n]?.() ?? '';
  const proc = step === 'procesando';
  $('[data-overlay]').innerHTML = `<div class="wizard" role="dialog" aria-modal="true" aria-labelledby="wz-title">
    <aside class="wz-rail"><h2 id="wz-title">Crear un aula</h2><ol class="wz-steps">${WZ_STEPS.map(([l, s], i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}" ${i + 1 === n ? 'aria-current="step"' : ''}><span class="stop">${i + 1 < n ? icon('check') : i + 1}</span><span><strong>${l}</strong><small>${s}</small></span></li>`).join('')}</ol>
      <p class="wz-save ${wz.dirty ? 'dirty' : ''}"><i></i>${wz.dirty ? 'Cambios sin guardar' : 'Borrador guardado'}</p></aside>
    <section class="wz-main"><div class="wz-body">${proc ? wzProcessing() : body}</div>
      ${proc ? '' : `<footer class="wz-foot"><button class="btn quiet" data-act="wz-exit">Guardar y salir</button><span class="spacer"></span>${n > 1 ? `<button class="btn secondary" data-act="wz-go" data-to="${n - 1}">${icon('arrow-left')}Atrás</button>` : ''}
        ${n < 4 ? `<button class="btn primary" data-act="wz-next" data-n="${n}">Continuar${icon('arrow-right')}</button>` : `<button class="btn primary" data-act="wz-create">${icon('check')}Crear mi aula</button>`}</footer>`}</section>
    <aside class="wz-preview" aria-label="Vista previa"><h3>Así se va a ver tu aula</h3>${roomCard({ id: 'x', name: wz.name || 'Tu próxima aula', subject: wz.subject || 'Materia', division: wz.division || 'Grupo', cover: wz.cover, students: 0, taught: 0, total: wz.units.reduce((s, u) => s + u.topics.length, 0) })}
      <p class="private">${icon('lock')}Tu borrador es sólo tuyo.</p></aside></div>`;
  if (proc) runProcessing();
}
function wzGeneral() {
  const wz = state.wz;
  return `<p class="step-kicker">Paso 1 de 4</p><h1>Dale identidad a tu aula</h1><p class="lead">Lo que completes acá es lo primero que va a ver tu grupo.</p>
  <div class="wz-form">
    <div class="field"><label for="f-name">Nombre del aula</label><input id="f-name" class="input" data-wz="name" maxlength="120" placeholder="Por ejemplo: Fotografía y luz" value="${esc(wz.name)}"></div>
    <div class="two"><div class="field"><label for="f-subj">Materia</label><input id="f-subj" class="input" data-wz="subject" maxlength="120" value="${esc(wz.subject)}"></div>
      <div class="field"><label for="f-div">Grupo o división</label><input id="f-div" class="input" data-wz="division" maxlength="60" placeholder="Por ejemplo: 3.º A" value="${esc(wz.division)}"></div></div>
    <div class="two"><div class="field"><label for="f-year">Ciclo lectivo</label><input id="f-year" class="input" type="number" min="1" max="9999" data-wz="year" value="${wz.year}"></div>
      <div class="field"><span class="lbl">Zona horaria</span><div class="tz">${icon('clock')}<span>Buenos Aires (GMT−3)</span><button class="link" type="button">Cambiar</button></div><small>Se usa para las entregas y queda fija al crearla.</small></div></div>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:6px">Una portada para reconocerla</legend>
      <div class="covers">${COVERS.map(([k, l]) => `<label class="cover-opt"><input type="radio" name="cover" value="${k}" data-wz="cover" ${wz.cover === k ? 'checked' : ''}><img src="${cover(k, 320)}" alt="">${l}</label>`).join('')}</div></fieldset>
  </div>`;
}
function wzProgram() {
  const wz = state.wz;
  const file = wz.file ? `<div class="file-row"><span class="ext pdf">PDF</span><span class="scan"><strong>${esc(wz.file)}</strong>
      ${wz.scan < 100 ? `<small>Subiendo y validando «${esc(wz.file)}»…</small><span class="trailbar orange"><i style="width:${wz.scan}%"></i></span>` : '<small>2,4 MB · revisado</small>'}</span>${wz.scan >= 100 ? `<span class="chip pine">${icon('check')}Aprobado</span>` : ''}</div>` : '';
  return `<p class="step-kicker">Paso 2 de 4</p><h1>Todo empieza con una buena base</h1><p class="lead">Subí tu programa. Subirlo no usa IA: elegís después cómo armar el recorrido.</p>
  <div class="wz-form">
    ${wz.file ? file : `<div class="drop" data-drop><img src="${PUB}/foxmind/foxy-reader.webp" alt="" width="96"><strong>Empezá por tu programa</strong><small>PDF, Word o PowerPoint · Hasta 20 MB</small><button class="btn secondary" data-act="wz-file">${icon('upload')}Elegir archivo</button></div>`}
    ${wz.file && wz.scan >= 100 ? `<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:6px">¿Cómo querés preparar el recorrido?</legend><div class="choice-grid">
      <label class="choice"><input type="radio" name="method" value="foxy" data-wz="method" ${wz.method === 'foxy' ? 'checked' : ''}><span class="tag chip sun">${icon('spark')}Usa IA</span><strong>Prepararlo con Foxy</strong><small>Una propuesta de unidades y temas a partir de tu programa.</small></label>
      <label class="choice"><input type="radio" name="method" value="manual" data-wz="method" ${wz.method === 'manual' ? 'checked' : ''}><strong>Armarlo a mano</strong><small>Organizá las unidades y los temas con tu propia mirada.</small></label></div></fieldset>
      <button class="link" data-act="wz-file">${icon('refresh')}Cambiar archivo</button>` : ''}
  </div>`;
}
const STAGES = ['Recibiendo tu programa', 'Dejándolo listo para trabajar', 'Enviando tu solicitud', 'Esperando el análisis', 'Preparando una propuesta para vos'];
function wzProcessing() {
  return `<div class="processing" aria-live="polite"><img class="fox" src="${PUB}/foxmind/foxy-reader.webp" alt=""><h1>Foxy está preparando tu recorrido</h1><p class="lead">Podés esperar acá o seguir con otra cosa: el borrador queda guardado.</p>
    <ol class="stages">${STAGES.map((s, i) => `<li data-stage="${i}"><span class="dot"></span>${s}</li>`).join('')}</ol>
    <button class="btn quiet" data-act="wz-manual">Armarlo a mano</button></div>`;
}
function runProcessing() {
  let i = 0; const tick = () => {
    if (route()[1] !== 'procesando') return;
    document.querySelectorAll('[data-stage]').forEach(li => { const k = Number(li.dataset.stage); li.className = k < i ? 'done' : k === i ? 'active' : ''; li.querySelector('.dot').innerHTML = k < i ? icon('check') : ''; });
    if (i++ < STAGES.length) setTimeout(tick, 850);
    else { state.wz.units = PLAN.map(u => ({ name: u.name, topics: u.topics.map(t => t[0]) })); state.wz.fromFoxy = true; go('crear/3'); }
  }; tick();
}
function wzPlan() {
  const wz = state.wz;
  if (!wz.units.length && wz.method === 'manual') wz.units = [{ name: '', topics: [''] }];
  return `<p class="step-kicker">Paso 3 de 4</p><h1>Un recorrido que invita a aprender</h1><p class="lead">Organizá las unidades y los temas. Podés cambiarlos más adelante.</p>
  ${wz.fromFoxy ? `<p class="ai-hint"><img src="${PUB}/foxmind/foxy.webp" alt="">Foxy acercó una primera idea. Revisala y ajustala a tu manera.</p>` : ''}
  <div class="units" style="margin-top:16px">${wz.units.map((u, i) => `<section class="unit" aria-label="Unidad ${i + 1}"><div class="unit-head"><span class="badge">Unidad ${i + 1}</span><input class="input" aria-label="Nombre de la unidad" data-unit="${i}" placeholder="Nombre de la unidad" value="${esc(u.name)}"><button class="icon-btn" data-act="rm-unit" data-i="${i}" aria-label="Quitar unidad ${i + 1}">${icon('trash')}</button></div>
    ${u.topics.map((t, j) => `<div class="topic"><input class="input" aria-label="Nombre del tema" data-topic="${i}.${j}" placeholder="Nombre del tema" value="${esc(t)}"><button class="icon-btn" data-act="rm-topic" data-i="${i}" data-j="${j}" aria-label="Quitar tema ${j + 1}">${icon('minus')}</button></div>`).join('')}
    <button class="link" style="margin:10px 0 0 32px" data-act="add-topic" data-i="${i}">${icon('plus')}Agregar tema</button></section>`).join('')}
    <button class="btn secondary" data-act="add-unit">${icon('plus')}Agregar unidad</button></div>`;
}
function wzReview() {
  const wz = state.wz; const topics = wz.units.reduce((s, u) => s + u.topics.length, 0);
  return `<p class="step-kicker">Paso 4 de 4</p><h1>Tu aula está a un paso</h1><p class="lead">Revisá los datos antes de crearla.</p>
  <div class="summary" aria-label="Resumen del aula"><img src="${cover(wz.cover, 320)}" alt=""><div style="display:grid;gap:12px"><dl><dt>Aula</dt><dd>${esc(wz.name)}</dd><dt>Materia</dt><dd>${esc(wz.subject)}</dd><dt>Grupo</dt><dd>${esc(wz.division)} · ${wz.year}</dd>
    <dt>Recorrido</dt><dd>Tu recorrido de aprendizaje · ${wz.units.length} unidades · ${topics} temas</dd></dl>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn secondary sm" data-act="wz-go" data-to="1">${icon('edit')}Editar datos del aula</button><button class="btn secondary sm" data-act="wz-go" data-to="3">${icon('edit')}Editar plan</button></div></div></div>
  <div class="notice" style="margin-top:16px">${icon('users')}<span><b>Primero tu aula. Después, tu grupo.</b> Al crearla, la vas a encontrar en Mis aulas. Desde ahí podés entrar e invitar a tus estudiantes.</span></div>`;
}
function celebrate() {
  const colors = ['#e8590c', '#ffc94d', '#1d6b57', '#5fbf97', '#d9a66b'];
  const leaves = Array.from({ length: 36 }, (_, i) => `<i class="leaf" style="left:${Math.random() * 100}vw;background:${colors[i % 5]};animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * .5}s;--dx:${Math.round(Math.random() * 160 - 80)}px;--r:${Math.round(Math.random() * 720)}deg"></i>`).join('');
  $('[data-overlay]').innerHTML = `${leaves}<div class="celebrate" role="dialog" aria-modal="true" aria-labelledby="ok-t"><div class="card"><img class="fox" src="${PUB}/foxmind-3d/states/success-320.webp" alt=""><h2 id="ok-t">¡Aula creada!</h2><p>Ya podés invitar a tus estudiantes.</p>
    <div style="display:flex;gap:10px"><button class="btn secondary" data-act="ok-list">Ver Mis aulas</button><button class="btn primary" data-act="ok-room">${icon('users')}Entrar e invitar</button></div></div></div>`;
  $('[data-act="ok-room"]').focus();
}

/* ---------- Interior del aula ---------- */
function roomView(id, tab) {
  const r = state.rooms.find(x => x.id === id) ?? state.rooms[0];
  const t = state.role === 'teacher'; const tabs = tabsFor(state.role);
  if (!tabs.some(([k]) => k === tab)) tab = 'plan';
  const arch = state.archived || r.archived;
  const content = { plan: tabPlan, muro: tabWall, biblioteca: tabLibrary, actividades: tabActivities, progreso: tabProgress, estudiantes: tabStudents, historial: tabHistory, ajustes: tabSettings, 'mi-progreso': tabMyProgress, companeros: tabPeers }[tab](r, arch);
  return `<nav class="crumbs" aria-label="Ubicación"><a href="#/aulas">Mis aulas</a>${icon('chevron-right')}<span aria-current="page">${esc(r.name)}</span></nav>
  <header class="room-head"><img class="bg" src="${cover(r.cover)}" alt="">
    <div><p class="sub">${esc(r.subject)} · ${esc(r.division)} · 2026 ${arch ? '<span class="chip sun">Archivada</span>' : ''}</p><h1>${esc(r.name)}</h1>
      <div class="facts"><span class="fact">${icon('users')}${r.students} estudiantes</span>
        <a class="fact" href="#/aula/${r.id}/${t ? 'progreso' : 'actividades'}">${icon('clipboard')}<b>${t ? r.review : 2}</b> ${t ? 'por revisar' : 'por hacer'}</a>
        <a class="fact" href="#/aula/${r.id}/plan">${icon('book')}<b>${r.taught}/${r.total}</b> temas trabajados</a></div></div>
    <div>${t ? `<button class="btn primary" data-act="invite" ${arch ? 'disabled' : ''}>${icon('plus')}Invitar</button>` : `<a class="btn secondary" href="#/aula/${r.id}/mi-progreso">${icon('progress')}Mi progreso</a>`}</div></header>
  ${arch ? `<p class="archived-bar">${icon('archive')}Aula archivada · Podés consultar el contenido. No se pueden publicar ni editar materiales o actividades.</p>` : ''}
  <nav class="tabs" aria-label="Secciones del aula">${tabs.map(([k, l, i]) => `<a href="#/aula/${r.id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${icon(i)}${l}</a>`).join('')}</nav>
  <section aria-label="${tabs.find(([k]) => k === tab)[1]}">${content}</section>`;
}
function emptyBlock(title, text, action = '') { return `<div class="empty"><img src="${PUB}/foxmind-3d/states/empty-320.webp" alt=""><h2>${title}</h2><p>${text}</p>${action}</div>`; }
function tabPlan(r, arch) {
  const t = state.role === 'teacher';
  if (state.empty) return emptyBlock('Todavía no hay temas en esta unidad.', 'Cuando el plan tenga temas, vas a verlos como un recorrido.');
  const open = state.openTopic ?? '0.2';
  return `<div class="section-head"><div><h2>Plan de estudio</h2><p>Elegí un tema para consultar sus materiales y actividades.</p></div><div class="actions"><span class="chip pine">${r.taught} de ${r.total} temas dados</span></div></div>
  <div class="plan-units">${PLAN.map((u, i) => { const done = u.topics.filter(x => x[1] === 'done').length; return `<section class="plan-unit"><header><span class="chip lake">Unidad ${i + 1}</span><h3>${u.name}</h3><span class="trailbar" aria-hidden="true"><i style="width:${done / u.topics.length * 100}%"></i></span><small>${done} de ${u.topics.length}</small></header>
    <ol class="topics">${u.topics.map(([name, st], j) => { const key = `${i}.${j}`; const isOpen = key === open; return `<li class="${st}">
      <span class="mark" aria-hidden="true">${st === 'done' ? icon('check') : ''}</span>
      <button class="link" style="color:var(--ink);text-align:left" data-act="open-topic" data-k="${key}" aria-expanded="${isOpen}"><span><strong>${name}</strong><small>${st === 'done' ? 'Dado' : st === 'now' ? 'En curso' : 'Pendiente'} · ${j % 2 ? 1 : 2} materiales · ${j % 3 ? 0 : 1} actividades</small></span></button>
      <span class="row-actions">${t && !arch ? (st === 'done' ? `<button class="btn quiet sm">Marcar como pendiente</button>` : `<button class="btn secondary sm" data-act="mark-done">${icon('check')}Marcar como dado</button>`) : `<span class="chip ${st === 'done' ? 'pine' : 'muted'}">${st === 'done' ? 'Dado' : 'Pendiente'}</span>`}</span>
      ${isOpen ? `<div class="topic-open"><div class="mini-card"><h4>${icon('folder')}Materiales</h4><ul><li>Guía: partes de la célula</li><li>Fotos de células al microscopio</li></ul>${t && !arch ? `<a class="link" href="#/aula/${r.id}/biblioteca?subir">${icon('plus')}Agregar material</a>` : ''}</div>
        <div class="mini-card"><h4>${icon('clipboard')}Actividades</h4><ul><li>Cuestionario: partes de la célula</li></ul>${t && !arch ? `<a class="link" href="#/aula/${r.id}/actividades/nueva">${icon('plus')}Crear actividad</a>` : ''}</div></div>` : ''}</li>`; }).join('')}</ol></section>`; }).join('')}</div>`;
}
function tabWall(r, arch) {
  const t = state.role === 'teacher';
  return `<div class="section-head"><div><h2>Conversemos en el aula</h2><p>Los avisos y las consultas son visibles para tu grupo.</p></div></div>
  <div style="display:grid;gap:14px;max-width:760px">
  ${arch ? '' : `<div class="composer"><label class="sr" for="wall">Mensaje</label><textarea id="wall" class="input" placeholder="${t ? 'Una idea para tu grupo' : 'Tu pregunta tiene lugar'}"></textarea><div class="bar"><small>Se compartirá dentro del aula.</small><button class="btn primary sm">${icon('chat')}Publicar mensaje</button></div></div>`}
  ${state.empty ? emptyBlock('Todavía no hay conversaciones', 'Los avisos y las consultas de este grupo van a aparecer acá.') : `
  <article class="post"><header><span class="avatar d">LD</span><span><strong>Lucía Demo</strong><small>Docente · hoy, 09:12</small></span><span class="chip orange">Aviso</span></header><p>Mañana traigan el cuaderno de campo: vamos a observar hojas al microscopio.</p>
    <div class="reply"><span class="avatar">AL</span><div><strong>Ada Lovelace</strong><p>¿Sirve también una carpeta común?</p></div></div><div class="acts"><button class="link">${icon('chat')}Responder publicación</button></div></article>
  <article class="post"><header><span class="avatar b">BD</span><span><strong>Bruno Díaz</strong><small>Estudiante · ayer, 18:40</small></span><span class="chip muted">Consulta</span></header><p>¿Puedo entregar el informe en PDF?</p><div class="acts"><button class="link">${icon('chat')}Responder publicación</button></div></article>`}</div>`;
}
function tabLibrary(r, arch) {
  const t = state.role === 'teacher'; const list = state.empty ? [] : state.materials;
  return `<div class="section-head"><div><h2>Biblioteca</h2><p>Archivos y apuntes compartidos con el aula.</p></div><div class="actions">${t && !arch ? `<button class="btn primary" data-act="upload">${icon('upload')}Subir archivo</button>` : ''}</div></div>
  <div class="toolbar" style="margin-top:0"><label class="search" style="margin:0"><span class="sr">Buscar material</span>${icon('search')}<input class="input" placeholder="Título o archivo"></label>
    <label class="field" style="min-width:240px"><span class="sr">Unidad o tema</span><select class="input"><option>Todos los materiales</option><option>Sin unidad ni tema</option>${PLAN.map(u => `<optgroup label="${u.name}">${u.topics.map(x => `<option>${x[0]}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <span class="chip muted" style="margin-left:auto">${list.length} materiales</span></div>
  ${list.length ? `<div class="rows">${list.map((m, i) => `<article class="row ${i === 0 && state.justUploaded ? 'landing' : ''}"><span class="ext ${m.ext}">${m.ext.toUpperCase()}</span><div class="grow"><strong>${esc(m.title)}</strong><small>${m.ext.toUpperCase()} · ${esc(m.where)} · ${m.size}</small>
    <div class="tags"><span class="chip ${m.use === 'Material de estudio' ? 'pine' : m.use === 'Recomendado' ? 'sun' : 'muted'}">${m.use}</span>${m.links ? `<span class="chip muted">${icon('link')}${m.links} ${m.links === 1 ? 'actividad vinculada' : 'actividades vinculadas'}</span>` : ''}</div></div>
    <button class="btn secondary sm" aria-label="Abrir material: ${esc(m.title)}">${icon('eye')}Abrir</button>${t && !arch ? `<button class="icon-btn" aria-label="Más acciones">${icon('more')}</button>` : `<button class="icon-btn" aria-label="Descargar material">${icon('download')}</button>`}</article>`).join('')}</div>`
    : emptyBlock('Todavía no hay materiales', 'Los recursos compartidos para esta aula van a aparecer acá.')}`;
}
function tabActivities(r, arch) {
  const t = state.role === 'teacher';
  const f = state.actFilter ?? 'shared'; const all = state.empty ? [] : state.activities;
  if (!t) {
    const mine = all.filter(a => a.status === 'shared' || a.studentState === 'Devolución publicada');
    const tone = { 'Para empezar': 'orange', 'Borrador guardado': 'sun', 'Devolución publicada': 'pine' };
    return `<div class="section-head"><div><h2>Tu próxima oportunidad de aprender</h2><p>Leé la consigna, probá tus ideas y compartí lo que aprendiste.</p></div></div>
    ${mine.length ? `<div class="act-grid">${mine.map(a => `<article class="act"><div class="top"><span class="chip muted">${a.type}</span><span class="chip ${tone[a.studentState ?? 'Para empezar'] ?? 'muted'}">${a.studentState ?? 'Para empezar'}</span></div><h3>${esc(a.title)}</h3>
      <div class="meta"><span>${icon('calendar')}${a.due}</span></div><div class="foot"><button class="btn primary sm">${a.studentState === 'Borrador guardado' ? 'Continuar borrador' : a.studentState === 'Devolución publicada' ? 'Ver devolución' : 'Empezar actividad'}</button></div></article>`).join('')}</div>`
      : emptyBlock('El próximo desafío está por venir', 'Tu docente va a compartir las actividades en este espacio.')}`;
  }
  const list = all.filter(a => a.status === f);
  const counts = { shared: all.filter(a => a.status === 'shared').length, draft: all.filter(a => a.status === 'draft').length };
  return `<div class="section-head"><div><h2>Ideas que se ponen en práctica</h2><p>Prepará propuestas y acompañá cada entrega.</p></div><div class="actions">${arch ? '' : `<a class="btn primary" href="#/aula/${r.id}/actividades/nueva">${icon('plus')}Crear actividad</a>`}</div></div>
  <div class="seg-tabs" role="group" aria-label="Filtrar actividades" style="margin-bottom:18px"><button data-act="act-filter" data-f="shared" aria-pressed="${f === 'shared'}">Compartidas<span class="count">${counts.shared}</span></button><button data-act="act-filter" data-f="draft" aria-pressed="${f === 'draft'}">Borradores privados<span class="count">${counts.draft}</span></button></div>
  ${list.length ? `<div class="act-grid">${list.map(a => `<article class="act ${a.status === 'draft' ? 'draft' : ''} ${a.fresh ? 'room landing' : ''}"><div class="top"><span class="chip ${a.status === 'draft' ? 'orange' : 'pine'}">${a.status === 'draft' ? 'Sólo vos · Borrador' : 'Compartida'}</span><span class="chip muted">${a.type}</span></div><h3>${esc(a.title)}</h3>
    <div class="meta"><span>${icon('calendar')}${a.due}</span><span>${icon('file')}${a.subs} entregas</span></div><div class="foot">${a.status === 'draft' ? `<a class="btn secondary sm" href="#/aula/${r.id}/actividades/nueva">Seguir creando</a>` : `<button class="btn secondary sm">Ver actividad</button>`}</div></article>`).join('')}</div>`
    : f === 'draft' ? emptyBlock('Tus próximas ideas tienen lugar acá', 'Guardá una actividad y retomá sin compartirla todavía.') : emptyBlock('Prepará la primera actividad para tu grupo.', 'Las actividades compartidas van a aparecer acá.')}`;
}
function tabProgress(r) {
  if (state.empty) return emptyBlock('Invitá a tu grupo para empezar a acompañar sus recorridos.', 'Cuando haya estudiantes y entregas, vas a ver su avance acá.', '<button class="btn primary" data-act="invite">Invitar estudiantes</button>');
  return `<div class="section-head"><div><h2>Seguimiento del aprendizaje</h2><p>Lo que ves sale de las entregas y del plan que vas marcando.</p></div></div>
  <div class="stats"><div class="stat"><span>Por acompañar</span><strong>2 <small>estudiantes</small></strong></div><div class="stat"><span>Entregas recibidas</span><strong>17 <small>/ 24</small></strong><span class="trailbar orange"><i style="width:71%"></i></span></div><div class="stat"><span>Plan trabajado</span><strong>64 <small>%</small></strong><span class="trailbar"><i style="width:64%"></i></span></div></div>
  <h3 style="font-size:18px;font-weight:900;margin:6px 0 12px">Cada estudiante, su recorrido</h3>
  <table class="table"><thead><tr><th>Estudiante</th><th>Prioridad</th><th>Entregas</th><th>Promedio publicado</th></tr></thead><tbody>
  ${STUDENTS.map(([n, p, d, tot, avg], i) => `<tr><td><span class="who"><span class="avatar ${'abcd'[i % 4]}">${n.split(' ').map(w => w[0]).join('')}</span>${n}</span></td><td><span class="prio ${p}"><i></i>${{ high: 'Alta', mid: 'Media', low: 'Baja' }[p]}</span></td><td>${d} de ${tot}</td><td>${avg ?? '—'}</td></tr>`).join('')}</tbody></table>`;
}
function tabStudents(r, arch) {
  return `<div class="split"><div><div class="section-head"><div><h2>Aprendemos en grupo</h2><p>${state.empty ? 0 : STUDENTS.length} estudiantes en ${esc(r.name)}</p></div><div class="actions">${arch ? '' : `<button class="btn primary" data-act="invite">${icon('plus')}Invitar estudiantes</button>`}</div></div>
    ${state.empty ? emptyBlock('Todavía no hay estudiantes en el aula', 'Compartí el código o enviá invitaciones por correo.') : `<div class="rows">${STUDENTS.map(([n, p], i) => `<article class="row"><span class="avatar ${'abcd'[i % 4]}">${n.split(' ').map(w => w[0]).join('')}</span><div class="grow"><strong>${n}</strong><small>Inscripto desde el 3 de marzo</small></div><span class="prio ${p}"><i></i>${{ high: 'Prioridad alta', mid: 'Prioridad media', low: 'Prioridad baja' }[p]}</span><button class="btn secondary sm">Ver ficha</button></article>`).join('')}</div>`}</div>
  <aside><div class="code-card"><h3>Un código, una puerta abierta</h3><p>Compartí este código con tu grupo.</p><div class="code" aria-label="Código del aula: K 7 M 2 Q 9">${'K7M2Q9'.split('').map(c => `<span>${c}</span>`).join('')}</div>
    <button class="btn primary" data-act="copy">${icon('copy')}Copiar código</button><button class="btn secondary sm">${icon('refresh')}Generar código</button></div>
    <h3 style="font-size:16px;font-weight:900;margin:20px 0 4px">Invitaciones enviadas</h3><div class="invites">
    ${[['f.gomez@escuela.test', 'Pendiente', 'sun'], ['l.paz@escuela.test', 'Aceptada', 'pine'], ['m.rios@escuela.test', 'Vencida', 'muted']].map(([m, s, c]) => `<article class="row"><div class="grow"><strong style="font-size:14px">${m}</strong><small>Correo aceptado para envío.</small></div><span class="chip ${c}">${s}</span></article>`).join('')}</div></aside></div>`;
}
function tabHistory() {
  return `<div class="section-head"><div><h2>Historial</h2><p>Estudiantes que dejaron el aula. Sus registros académicos se conservan.</p></div></div>
  ${state.empty ? emptyBlock('Cada recorrido deja una historia', 'Acá vas a encontrar a quienes hayan dejado el aula. Sus trabajos y devoluciones se conservan.') : `<div class="rows">
  ${[['Federico Gómez', 'Ingreso: 03/03/2026 — 12/06/2026 · Salida voluntaria'], ['Lucas Paz', 'Ingreso: 03/03/2026 — 28/08/2026 · Removido por docente']].map(([n, p], i) => `<article class="row"><span class="avatar ${'cd'[i]}">${n.split(' ').map(w => w[0]).join('')}</span><div class="grow"><strong>${n}</strong><small>${p}</small></div><button class="btn secondary sm">Ver registros</button></article>`).join('')}</div>`}`;
}
function tabSettings(r, arch) {
  return `<div class="split"><div class="panel"><div class="section-head"><div><h2>Tu aula, a tu manera</h2><p>Los cambios se aplican al guardar.</p></div></div>
    <div class="settings-form"><div class="field"><label for="s-n">Nombre del aula</label><input id="s-n" class="input" value="${esc(r.name)}" ${arch ? 'disabled' : ''}></div>
    <div class="wz-form"><div class="two"><div class="field"><label for="s-m">Materia</label><input id="s-m" class="input" value="${esc(r.subject)}" ${arch ? 'disabled' : ''}></div><div class="field"><label for="s-g">Grupo o división</label><input id="s-g" class="input" value="${esc(r.division)}" ${arch ? 'disabled' : ''}></div></div>
    <div class="two"><div class="field"><span class="lbl">Ciclo lectivo</span><div class="tz">2026<span class="chip muted" style="margin-left:auto">Sólo lectura</span></div></div><div class="field"><span class="lbl">Zona horaria</span><div class="tz">Buenos Aires (GMT−3)<span class="chip muted" style="margin-left:auto">Fija</span></div></div></div></div>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:6px">Portada</legend><div class="covers">${COVERS.map(([k, l]) => `<label class="cover-opt"><input type="radio" name="s-cover" ${r.cover === k ? 'checked' : ''} ${arch ? 'disabled' : ''}><img src="${cover(k, 320)}" alt="">${l}</label>`).join('')}</div></fieldset>
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" ${arch ? 'disabled' : ''}>Guardar cambios</button></div></div></div>
  <aside class="danger-zone"><h3>Estado del aula</h3>${arch ? `<span class="chip sun">Archivada · solo consulta</span><p>Se habilitarán las acciones habituales. Los plazos existentes se conservan.</p><button class="btn secondary" data-act="unarchive">Reactivar aula</button>`
    : `<p>Archivar conserva las clases, las entregas y las devoluciones para consultarlas después.</p><button class="btn secondary" data-act="archive">${icon('archive')}Archivar aula</button>`}</aside></div>`;
}
function tabMyProgress() {
  return `<div class="section-head"><div><h2>Tu trabajo va tomando forma</h2><p>Tus notas publicadas y el camino de la clase, por separado.</p></div></div>
  <div class="stats"><div class="stat"><span>Tu promedio publicado</span><strong>8,4 <small>/ 10</small></strong></div><div class="stat"><span>Tus devoluciones</span><strong>3</strong><span style="font-size:13px">Una pista para reconocer tus avances y seguir aprendiendo.</span></div><div class="stat"><span>El camino de la clase</span><strong>9 <small>de 14 temas</small></strong><span class="trailbar"><i style="width:64%"></i></span></div></div>
  <div class="rows">${[['Cuestionario: qué es una célula', '9'], ['Informe: observación de hojas', '8'], ['Cuestionario: partes de la célula', '8,2']].map(([n, g]) => `<article class="row"><span class="ext txt">${g}</span><div class="grow"><strong>${n}</strong><small>Devolución publicada · Biología 3.° B</small></div><button class="btn secondary sm">Ver devolución</button></article>`).join('')}</div>`;
}
function tabPeers(r) {
  return `<div class="section-head"><div><h2>Tu grupo</h2><p>${STUDENTS.length + 1} estudiantes en ${esc(r.name)}</p></div></div>
  <div class="rows"><article class="row"><span class="avatar c">MD</span><div class="grow"><strong>Marina Demo</strong><small>Vos</small></div></article>
  ${STUDENTS.map(([n], i) => `<article class="row"><span class="avatar ${'abd'[i % 3]}">${n.split(' ').map(w => w[0]).join('')}</span><div class="grow"><strong>${n}</strong><small>Estudiante</small></div></article>`).join('')}</div>
  <div style="margin-top:22px"><button class="btn quiet" data-act="leave">${icon('logout')}Salir de esta aula</button></div>`;
}

/* ---------- Editor de actividad ---------- */
function newEditor(foxy) { return { step: 1, foxy, type: 'QUESTIONNAIRE', topics: ['Partes de la célula'], tab: 'consigna', gen: foxy ? 'setup' : null, counts: [0, 2, 3, 1], title: '', goal: '', prompt: '', questions: [] }; }
const TYPES = [['ASSIGNMENT', 'Trabajo práctico', 'Una consigna con respuesta o archivos.'], ['QUESTIONNAIRE', 'Cuestionario', 'Preguntas para practicar y repasar.'], ['EVALUATION', 'Evaluación', 'Preguntas con puntaje y devolución.']];
function renderEditor() {
  const e = state.editor; const steps = ['Alcance', 'Contenido', 'Revisión'];
  const type = TYPES.find(x => x[0] === e.type)[1];
  const body = e.step === 1 ? edScope() : e.step === 2 ? (e.gen === 'running' ? edGenerating() : edContent()) : edReview();
  $('[data-overlay]').innerHTML = `<div class="editor" role="dialog" aria-modal="true" aria-labelledby="ed-t">
    <header class="editor-top"><button class="icon-btn" data-act="ed-exit" aria-label="Salir del editor">${icon('close')}</button><div><h1 id="ed-t">${e.title ? esc(e.title) : 'Nueva actividad'}</h1><small>${type} · Biología 3.° B</small></div>
      <div class="stepper" aria-label="Pasos">${steps.map((s, i) => `<span class="${i + 1 < e.step ? 'done' : i + 1 === e.step ? 'on' : ''}" ${i + 1 === e.step ? 'aria-current="step"' : ''}><b>${i + 1 < e.step ? '✓' : i + 1}</b><em>${s}</em></span>`).join('')}</div></header>
    <div class="editor-body"><div class="inner">${body}</div></div>
    <footer class="editor-foot"><span class="status">${e.step === 1 ? 'Borrador nuevo.' : 'Último estado guardado.'}</span><span class="spacer"></span>
      ${e.step > 1 ? `<button class="btn quiet" data-act="ed-step" data-to="${e.step - 1}">${icon('arrow-left')}Atrás</button>` : ''}<button class="btn secondary" data-act="ed-save">Guardar borrador</button>
      ${e.step === 1 ? (e.foxy ? `<button class="btn primary" data-act="ed-generate">${icon('spark')}Generar propuesta</button>` : `<button class="btn primary" data-act="ed-step" data-to="2">Continuar${icon('arrow-right')}</button>`)
        : e.step === 2 ? `<button class="btn primary" data-act="ed-step" data-to="3" ${e.gen === 'running' ? 'disabled' : ''}>Continuar a revisión${icon('arrow-right')}</button>` : `<button class="btn primary" data-act="ed-publish">${icon('check')}Publicar actividad</button>`}</footer></div>`;
}
function edScope() {
  const e = state.editor;
  return `<section class="panel"><h2 style="font-size:20px;font-weight:900;margin-bottom:4px">¿Qué va a trabajar tu grupo?</h2><p style="color:var(--muted);font-weight:600;margin-bottom:14px">${e.topics.length} temas en 1 unidad</p>
    <div class="seg-tabs" role="group" aria-label="Alcance" style="margin-bottom:14px"><button aria-pressed="true">Temas</button><button aria-pressed="false">Unidades completas</button></div>
    <div class="choice-grid">${PLAN[0].topics.map(([n]) => `<label class="choice"><input type="checkbox" data-ed-topic="${n}" ${e.topics.includes(n) ? 'checked' : ''}><strong>${n}</strong><small>La célula</small></label>`).join('')}</div></section>
  <section class="panel"><h2 style="font-size:20px;font-weight:900;margin-bottom:12px">Tipo de actividad</h2><div class="choice-grid">${TYPES.map(([k, l, d]) => `<label class="choice"><input type="radio" name="type" data-ed-type="${k}" ${e.type === k ? 'checked' : ''}><strong>${l}</strong><small>${d}</small></label>`).join('')}</div></section>
  <section class="panel"><h2 style="font-size:20px;font-weight:900;margin-bottom:12px">¿Cómo la querés preparar?</h2><div class="choice-grid">
    <label class="choice"><input type="radio" name="how" data-ed-foxy="0" ${e.foxy ? '' : 'checked'}><strong>Manualmente</strong><small>Escribís la consigna y las preguntas.</small></label>
    <label class="choice"><input type="radio" name="how" data-ed-foxy="1" ${e.foxy ? 'checked' : ''}><span class="tag chip sun">${icon('spark')}Usa IA</span><strong>Con ayuda de Foxy</strong><small>Foxy prepara una propuesta que revisás antes de guardar.</small></label></div>
    ${e.foxy ? `<div style="display:grid;gap:14px;margin-top:16px"><div class="field"><label for="idea">Tu idea para Foxy</label><textarea id="idea" class="input" maxlength="1200" placeholder="Por ejemplo: preguntas para repasar las partes de la célula con ejemplos cotidianos."></textarea></div>
      <div class="counters">${['Consignas', 'Desarrollo', 'Selección única', 'Selección múltiple'].map((l, i) => `<div class="counter"><span>${l}</span><div class="ctl"><button aria-label="Menos ${l}" data-act="cnt" data-i="${i}" data-d="-1">−</button><b>${e.counts[i]}</b><button aria-label="Más ${l}" data-act="cnt" data-i="${i}" data-d="1">+</button></div></div>`).join('')}</div>
      <p class="state wait">${icon('spark')}Generar utiliza IA y puede consumir cuota. Cambiar estos ajustes no genera contenido.</p></div>` : ''}</section>`;
}
function edGenerating() {
  return `<div class="gen" aria-live="polite"><img src="${PUB}/foxmind/foxy-creative.webp" alt=""><h2 style="font-size:24px;font-weight:900">Foxy está preparando tu propuesta</h2><p style="color:var(--muted);font-weight:600">Revisá y editá la propuesta antes de compartirla con tu grupo.</p>
    <ol class="stages">${['En cola', 'Generando', 'Lista para revisar'].map((s, i) => `<li data-gstage="${i}"><span class="dot"></span>${s}</li>`).join('')}</ol></div>`;
}
function edContent() {
  const e = state.editor; const quiz = e.type !== 'ASSIGNMENT';
  const tabs = [['consigna', 'Consigna'], ...(quiz ? [['preguntas', `Preguntas ${e.questions.length}`]] : []), ['rubrica', 'Rúbrica 100 %']];
  let panel = '';
  if (e.tab === 'consigna') panel = `<div class="field"><label for="t">Título</label><input id="t" class="input" maxlength="200" placeholder="Ej. Cuaderno de campo" data-ed="title" value="${esc(e.title)}"></div>
    <div class="field"><label for="g">Objetivo de aprendizaje</label><textarea id="g" class="input" maxlength="1400" data-ed="goal">${esc(e.goal)}</textarea></div>
    <div class="field"><label for="c">Consignas</label><textarea id="c" class="input" maxlength="5000" data-ed="prompt">${esc(e.prompt)}</textarea></div>
    <div class="field"><span class="lbl">Materiales de consulta</span><div class="choice-grid">${state.materials.slice(0, 2).map(m => `<label class="choice"><input type="checkbox" checked><strong>${m.title}</strong><small>${m.ext.toUpperCase()} · ${m.size}</small></label>`).join('')}</div></div>
    <div class="wz-form"><div class="two"><div class="field"><label for="d">Fecha y hora límite · Opcional</label><input id="d" class="input" type="datetime-local" value="2026-11-27T23:59"><small>Hora de Buenos Aires, la zona del aula.</small></div>
      <label class="choice" style="align-self:end"><input type="checkbox"><strong>Permitir entregas tardías</strong><small>Aceptar entregas fuera de término</small></label></div></div>`;
  else if (e.tab === 'preguntas') panel = (e.questions.length ? e.questions.map((q, i) => `<div class="question"><header><span class="chip lake">Pregunta ${i + 1}</span><span class="chip muted">${q.kind}</span><button class="icon-btn" style="margin-left:auto" aria-label="Quitar pregunta ${i + 1}">${icon('trash')}</button></header>
      <input class="input" aria-label="Enunciado" value="${esc(q.text)}">${q.opts ? q.opts.map((o, j) => `<div class="opt"><input type="radio" name="q${i}" ${j === q.ok ? 'checked' : ''} aria-label="Correcta"><input class="input" aria-label="Opción ${j + 1}" value="${esc(o)}"><span class="ok">${j === q.ok ? icon('check') : ''}</span></div>`).join('') : ''}</div>`).join('')
      : `<p class="state wait">Agregá la primera pregunta para empezar.</p>`) + `<button class="btn secondary" data-act="add-q">${icon('plus')}Agregar pregunta</button>`;
  else panel = `<div class="rows">${[['Identifica las partes', '40 %'], ['Explica su función', '40 %'], ['Usa vocabulario preciso', '20 %']].map(([c, w]) => `<article class="row"><div class="grow"><strong>${c}</strong><small>Logrado · En proceso · Por empezar</small></div><span class="chip lake">${w}</span></article>`).join('')}</div>`;
  return `${e.gen === 'done' ? `<p class="ai-hint"><img src="${PUB}/foxmind/foxy.webp" alt=""><span><b>Propuesta de Foxy.</b> Editá el contenido y los criterios antes de guardar el borrador.</span></p>` : ''}
  <div class="subtabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${e.tab === k}" data-act="ed-tab" data-k="${k}">${l}</button>`).join('')}</div><div style="display:grid;gap:16px">${panel}</div>`;
}
function edReview() {
  const e = state.editor; const type = TYPES.find(x => x[0] === e.type)[1];
  return `<div><h2 style="font-size:24px;font-weight:900">Revisá antes de publicar</h2><p style="color:var(--muted);font-weight:600">Verificá qué recibirán tus estudiantes antes de asignarla.</p></div>
  <div class="review"><article class="student-view"><div class="sv-head">${icon('eye')}Vista del estudiante</div><div class="sv-body"><span class="chip muted">${type}</span><h2>${esc(e.title || 'Cuestionario: partes de la célula')}</h2>
    <p style="font-weight:600">${esc(e.goal || 'Reconocer las partes de la célula y explicar qué hace cada una.')}</p><p style="color:var(--muted);font-weight:600">${esc(e.prompt || 'Respondé las preguntas. Podés consultar la guía de la Biblioteca.')}</p>
    ${e.questions.length ? `<p class="state ok">${icon('clipboard')}${e.questions.length} preguntas</p>` : ''}</div></article>
  <aside class="dest"><h3>Destino</h3><dl><dt>Aula</dt><dd>Biología · 3.° B</dd><dt>Tipo</dt><dd>${type}</dd><dt>Alcance</dt><dd>${e.topics.join(', ')}</dd><dt>Materiales</dt><dd>2 de consulta</dd><dt>Fecha límite</dt><dd>27 nov, 23:59 · Plazo estricto</dd></dl>${e.type !== 'ASSIGNMENT' ? '<button class="link">Preguntas y clave docente</button>' : ''}</aside></div>`;
}
function runGeneration() {
  let i = 0; const tick = () => {
    if (!state.editor || state.editor.gen !== 'running') return;
    document.querySelectorAll('[data-gstage]').forEach(li => { const k = Number(li.dataset.gstage); li.className = k < i ? 'done' : k === i ? 'active' : ''; li.querySelector('.dot').innerHTML = k < i ? icon('check') : ''; });
    if (i++ < 3) setTimeout(tick, 900);
    else Object.assign(state.editor, { gen: 'done', tab: 'preguntas', title: 'Cuestionario: partes de la célula', goal: 'Reconocer las partes de la célula y explicar qué hace cada una.', prompt: 'Respondé cada pregunta con tus palabras. Podés consultar la guía.',
      questions: [{ kind: 'Selección única', text: '¿Qué estructura controla lo que entra y sale de la célula?', opts: ['Membrana plasmática', 'Núcleo', 'Pared celular'], ok: 0 }, { kind: 'Selección única', text: '¿Dónde está el material genético?', opts: ['Citoplasma', 'Núcleo', 'Vacuola'], ok: 1 }, { kind: 'Desarrollo', text: 'Explicá con un ejemplo cotidiano para qué sirven las mitocondrias.' }] }) && renderEditor();
  }; tick();
}

/* ---------- Diálogos ---------- */
function dialogShell(title, sub, content, foot, wide = false) {
  return `<div class="scrim" data-scrim><div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dl-t"><header><div><h2 id="dl-t">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn" data-act="close" aria-label="Cerrar">${icon('close')}</button></header>${content}<footer>${foot}</footer></div></div>`;
}
function renderDialog() {
  const d = state.dialog; let html = '';
  if (!d) { document.querySelector('[data-scrim]')?.remove(); return; }
  if (d.kind === 'del-draft') html = dialogShell('Eliminar borrador', '', `<div class="content"><p>Vas a eliminar «Química orgánica». Se perderán los datos guardados de esta creación. Esta acción no se puede deshacer.</p></div>`, `<button class="btn quiet" data-act="close">Cancelar</button><button class="btn danger" data-act="confirm-del">${icon('trash')}Eliminar borrador</button>`);
  if (d.kind === 'join') html = dialogShell('Unirme con código', 'Ingresá el código que te compartió tu docente.', `<div class="content"><div class="field"><label for="code">Código del aula</label><input id="code" class="input" data-code maxlength="6" autocomplete="off" style="font-size:26px;font-weight:900;letter-spacing:.4em;text-align:center;text-transform:uppercase" value="${esc(d.code)}"></div>${d.error ? `<p class="state bad">${icon('warning')}${d.error}</p>` : ''}</div>`, `<button class="btn quiet" data-act="close">Cancelar</button><button class="btn primary" data-act="join-go">Unirme</button>`);
  if (d.kind === 'archive') html = dialogShell('Archivar aula', '', `<div class="content"><p>Mientras esté archivada, no se podrán realizar cambios ni nuevas inscripciones. Archivar conserva las clases, las entregas y las devoluciones para consultarlas después.</p></div>`, `<button class="btn quiet" data-act="close">Cancelar</button><button class="btn primary" data-act="archive-go">${icon('archive')}Archivar aula</button>`);
  if (d.kind === 'leave') html = dialogShell('Salir del aula', '', `<div class="content"><p>Perderás acceso al aula. Tu historial se conserva y para volver necesitarás una invitación nueva del docente.</p></div>`, `<button class="btn quiet" data-act="close">Cancelar</button><button class="btn danger" data-act="leave-go">Salir del aula</button>`);
  if (d.kind === 'confirm-publish') html = dialogShell('Confirmá la publicación', '', `<div class="content"><p>«${esc(state.editor?.title || 'Cuestionario: partes de la célula')}» quedará disponible para estudiantes de Biología 3.° B.</p></div>`, `<button class="btn quiet" data-act="close">Volver a revisar</button><button class="btn primary" data-act="publish-go">${icon('check')}Asignar al aula</button>`);
  if (d.kind === 'ed-exit') html = dialogShell('Salir del editor', 'Tenés cambios sin guardar.', '<div class="content"><p>Las preguntas incompletas o inválidas no se guardan.</p></div>', `<button class="btn quiet" data-act="close">Seguir editando</button><button class="btn secondary" data-act="ed-discard">Descartar cambios</button><button class="btn primary" data-act="ed-save-exit">Guardar y salir</button>`);
  if (d.kind === 'invite') html = inviteDialog(d);
  if (d.kind === 'upload') html = uploadDialog(d);
  document.querySelector('[data-scrim]')?.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  const first = document.querySelector('[data-scrim] [data-code], [data-scrim] .content input.input, [data-scrim] textarea, [data-scrim] .btn.primary:not([disabled])');
  first?.focus();
}
function inviteDialog(d) {
  const emails = ['f.gomez@escuela.test', 'l.paz@escuela.test', 'm.rios@escuela.test', 'sofi.lopez@escuela.test'];
  if (d.phase === 'compose') return dialogShell('Invitar estudiantes', 'Sumá a tu grupo en un solo paso.', `<div class="content"><p style="font-weight:600">Cada persona recibirá una invitación para aceptar con su propio correo. Podés invitar hasta 50 personas por vez.</p>
    <div class="field"><label for="emails">Correos, uno por línea</label><textarea id="emails" class="input">${emails.join('\n')}</textarea></div></div>`, `<button class="btn quiet" data-act="close">Cancelar</button><button class="btn primary" data-act="invite-go">${icon('users')}Invitar a 4 personas</button>`);
  const done = d.done ?? 0;
  return dialogShell('Invitar estudiantes', `${done} de 4 procesadas`, `<div class="content"><span class="trailbar orange"><i style="width:${done * 25}%;transition:width .4s"></i></span><div class="batch">${emails.map((m, i) => `<article class="row"><div class="grow"><strong style="font-size:14px">${m}</strong><small>${i < done ? (i === 1 ? 'Ya estaba invitada' : 'Correo en cola de envío.') : 'Preparando invitación…'}</small></div><span class="chip ${i < done ? (i === 1 ? 'muted' : 'pine') : 'sun'}">${i < done ? (i === 1 ? 'Ya invitada' : 'Enviada') : 'En curso'}</span></article>`).join('')}</div>
    ${done === 4 ? '<p class="state ok">Las invitaciones en cola se enviarán por correo. La inscripción se confirma cuando cada estudiante acepta.</p>' : ''}</div>`, done === 4 ? `<button class="btn quiet" data-act="invite-more">Invitar a más personas</button><button class="btn primary" data-act="close">Cerrar</button>` : `<button class="btn primary" disabled>Preparando invitaciones…</button>`);
}
function uploadDialog(d) {
  const steps = `<div class="steps-mini"><span class="${d.step < 2 ? 'on' : 'done'}">1. Archivo y detalles</span><span class="${d.step === 2 ? 'on' : ''}">2. Organización</span></div>`;
  if (d.step === 0) return dialogShell('Subir archivo', 'Compartí un recurso con el aula.', `${steps}<div class="content"><div class="choice-grid"><label class="choice"><input type="radio" name="kind" checked><strong>${icon('upload')} Subir archivo</strong><small>PDF, Word, PowerPoint, imágenes, Excel o ZIP.</small></label>
    <label class="choice"><input type="radio" name="kind"><span class="tag chip sun">Por definir</span><strong>${icon('edit')} Escribir un apunte</strong><small>Un texto breve para leer en la app.</small></label></div>
    <div class="drop" data-drop><img src="${PUB}/foxmind/foxy-reader.webp" alt="" width="84"><strong>Archivo del material</strong><small>PDF, Word y PowerPoint · hasta 20 MB. Imágenes, Excel y ZIP · hasta 50 MB.</small><button class="btn secondary" data-act="up-pick">${icon('upload')}Seleccionar archivo</button></div></div>`, `<button class="btn quiet" data-act="close">Cancelar</button>`, true);
  if (d.step === 1) {
    const ready = (d.scan ?? 0) >= 100;
    return dialogShell('Subir archivo', 'Compartí un recurso con el aula.', `${steps}<div class="content"><div class="file-row"><span class="ext pdf">PDF</span><span class="scan"><strong>Guia-fotosintesis.pdf</strong>${ready ? '<small>2,4 MB</small>' : `<small>Procesando material…</small><span class="trailbar orange"><i style="width:${d.scan ?? 0}%"></i></span>`}</span><button class="link" data-act="up-pick">Cambiar archivo</button></div>
      ${ready ? `<p class="state ok">${icon('check')}Archivo aprobado. Ya podés publicarlo.</p>` : `<p class="state wait">${icon('shield')}Estamos revisando el archivo antes de que tu grupo pueda descargarlo.</p>`}
      <div class="field"><label for="mt">Título</label><input id="mt" class="input" maxlength="200" value="Guía: fotosíntesis"></div><div class="field"><label for="md">Descripción (opcional)</label><textarea id="md" class="input" style="min-height:80px">Leela antes de la clase del jueves.</textarea></div></div>`,
      `<button class="btn quiet" data-act="close">Cancelar</button><button class="btn primary" data-act="up-next" ${ready ? '' : 'disabled'}>Preparar y continuar${icon('arrow-right')}</button>`, true);
  }
  return dialogShell('Subir archivo', 'Compartí un recurso con el aula.', `${steps}<div class="content"><div class="field"><span class="lbl">¿Dónde lo van a encontrar?</span><div class="wz-form"><div class="two"><select class="input" aria-label="Unidad"><option>Nutrición de las plantas</option></select><select class="input" aria-label="Tema"><option>Fotosíntesis</option></select></div></div></div>
    <div class="field"><span class="lbl">Uso</span><div class="choice-grid">${['Material de estudio', 'Recomendado', 'Material complementario'].map((u, i) => `<label class="choice"><input type="radio" name="use" ${i === 0 ? 'checked' : ''}><strong>${u}</strong></label>`).join('')}</div></div>
    <div class="field"><span class="lbl">Actividades vinculadas (opcional)</span><label class="choice"><input type="checkbox"><strong>Cuestionario: partes de la célula</strong><small>Compartida · 27 nov</small></label></div></div>`,
    `<button class="btn quiet" data-act="up-back">${icon('arrow-left')}Volver</button><button class="btn primary" data-act="up-publish">${icon('check')}Publicar material</button>`, true);
}
function renderToast() {
  document.querySelector('.toast')?.remove();
  if (!state.toast) return;
  document.body.insertAdjacentHTML('beforeend', `<p class="toast" role="status">${icon('check')}${state.toast}</p>`);
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => { state.toast = null; document.querySelector('.toast')?.remove(); }, 3200);
}
const toast = text => { state.toast = text; renderToast(); };

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const roleBtn = ev.target.closest('[data-role]');
  if (roleBtn) { state.role = roleBtn.dataset.role; state.dialog = null; state.editor = null; go('aulas'); render(); return; }
  const tg = ev.target.closest('[data-toggle]');
  if (tg) { state[tg.dataset.toggle] = !state[tg.dataset.toggle]; render(); return; }
  if (ev.target.closest('[data-notes]')) { state.notes = !state.notes; $('[data-notes-panel]').hidden = !state.notes; $('[data-notes]').setAttribute('aria-expanded', String(state.notes)); return; }
  if (ev.target.matches('[data-scrim]')) { state.dialog = null; renderDialog(); return; }
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act; const [, roomId] = route();
  const wz = state.wz; const e = state.editor;
  const acts = {
    tab: () => { state.listTab = el.dataset.tab; render(); },
    'clear-search': () => { state.query = ''; render(); },
    join: () => { state.dialog = { kind: 'join', code: '' }; renderDialog(); },
    'join-go': () => { const c = $('[data-code]').value.trim(); if (c.length < 6) { state.dialog = { kind: 'join', code: c, error: 'Revisá el código: tiene 6 caracteres.' }; renderDialog(); return; } state.dialog = null; toast('Te uniste a Química 5.° A.'); renderDialog(); },
    accept: () => { state.joinedInvite = true; state.rooms.unshift({ id: 'qui', name: 'Química 5.° A', subject: 'Química', division: '5.° A', cover: 'science', students: 20, taught: 0, total: 12, review: 0 }); state.landing = 'qui'; toast('Ya sos parte de Química 5.° A.'); render(); },
    decline: () => { state.joinedInvite = true; render(); },
    'del-draft': () => { state.dialog = { kind: 'del-draft' }; renderDialog(); },
    'confirm-del': () => { state.drafts = []; state.dialog = null; toast('Borrador eliminado.'); render(); },
    close: () => { state.dialog = null; renderDialog(); },
    'wz-go': () => go(`crear/${el.dataset.to}`),
    'wz-next': () => { const n = Number(el.dataset.n); if (n === 2) { if (!wz.file || wz.scan < 100) return toast('Elegí tu programa para continuar.'); return go(wz.method === 'foxy' && !wz.units.length ? 'crear/procesando' : 'crear/3'); } go(`crear/${n + 1}`); },
    'wz-file': () => { wz.file = 'Programa-Ciencias-2026.pdf'; wz.scan = 0; renderWizard(2); const t = setInterval(() => { wz.scan = Math.min(100, wz.scan + 20); renderWizard(2); if (wz.scan >= 100) clearInterval(t); }, 350); },
    'wz-manual': () => { wz.method = 'manual'; wz.fromFoxy = false; go('crear/3'); },
    'wz-exit': () => { state.drafts = [{ id: 'd2', name: wz.name || 'Tu próxima aula', subject: wz.subject, division: wz.division, step: Number(route()[1]) || 1 }, ...state.drafts]; state.listTab = 'borradores'; toast('Borrador guardado.'); go('aulas'); },
    'wz-create': () => { const id = `n${Date.now()}`; state.rooms.unshift({ id, name: wz.name, subject: wz.subject, division: wz.division, cover: wz.cover, students: 0, taught: 0, total: wz.units.reduce((s, u) => s + u.topics.length, 0), review: 0, own: true }); state.landing = id; state.newRoom = id; celebrate(); },
    'ok-list': () => { state.listTab = 'activas'; state.wz = null; go('aulas'); },
    'ok-room': () => { state.wz = null; go(`aula/${state.newRoom}/estudiantes?invitar`); },
    'add-unit': () => { wz.units.push({ name: '', topics: [''] }); renderWizard(3); },
    'rm-unit': () => { wz.units.splice(Number(el.dataset.i), 1); renderWizard(3); toast('Unidad quitada. Deshacer'); },
    'add-topic': () => { wz.units[Number(el.dataset.i)].topics.push(''); renderWizard(3); },
    'rm-topic': () => { wz.units[Number(el.dataset.i)].topics.splice(Number(el.dataset.j), 1); renderWizard(3); },
    'open-topic': () => { state.openTopic = state.openTopic === el.dataset.k ? null : el.dataset.k; render(); },
    'mark-done': () => toast('Tema marcado como dado.'),
    upload: () => { state.dialog = { kind: 'upload', step: 0 }; renderDialog(); },
    'up-pick': () => { state.dialog = { kind: 'upload', step: 1, scan: 0 }; renderDialog(); const t = setInterval(() => { if (state.dialog?.kind !== 'upload') return clearInterval(t); state.dialog.scan = Math.min(100, state.dialog.scan + 25); renderDialog(); if (state.dialog.scan >= 100) clearInterval(t); }, 450); },
    'up-next': () => { state.dialog.step = 2; renderDialog(); },
    'up-back': () => { state.dialog.step = 1; renderDialog(); },
    'up-publish': () => { state.materials.unshift({ title: 'Guía: fotosíntesis', ext: 'pdf', use: 'Material de estudio', where: 'Nutrición de las plantas · Fotosíntesis', size: '2,4 MB', links: 0 }); state.justUploaded = true; state.dialog = null; toast('Material publicado.'); render(); },
    invite: () => { state.dialog = { kind: 'invite', phase: 'compose' }; renderDialog(); },
    'invite-go': () => { state.dialog = { kind: 'invite', phase: 'run', done: 0 }; renderDialog(); const t = setInterval(() => { if (state.dialog?.kind !== 'invite') return clearInterval(t); state.dialog.done++; renderDialog(); if (state.dialog.done >= 4) clearInterval(t); }, 600); },
    'invite-more': () => { state.dialog = { kind: 'invite', phase: 'compose' }; renderDialog(); },
    copy: () => toast('Código copiado.'),
    archive: () => { state.dialog = { kind: 'archive' }; renderDialog(); },
    'archive-go': () => { state.archived = true; state.dialog = null; toast('Aula archivada.'); render(); },
    unarchive: () => { state.archived = false; toast('Aula reactivada.'); render(); },
    leave: () => { state.dialog = { kind: 'leave' }; renderDialog(); },
    'leave-go': () => { state.dialog = null; toast('Saliste del aula.'); go('aulas'); },
    'act-filter': () => { state.actFilter = el.dataset.f; render(); },
    'ed-step': () => { e.step = Number(el.dataset.to); renderEditor(); },
    'ed-tab': () => { e.tab = el.dataset.k; renderEditor(); },
    'ed-generate': () => { e.step = 2; e.gen = 'running'; renderEditor(); runGeneration(); },
    cnt: () => { const i = Number(el.dataset.i); e.counts[i] = Math.max(0, Math.min(30, e.counts[i] + Number(el.dataset.d))); renderEditor(); },
    'add-q': () => { e.questions.push({ kind: 'Selección única', text: '', opts: ['', ''], ok: 0 }); renderEditor(); },
    'ed-save': () => toast('Borrador guardado.'),
    'ed-exit': () => { state.dialog = { kind: 'ed-exit' }; renderDialog(); },
    'ed-discard': () => { state.dialog = null; state.editor = null; go(`aula/${roomId}/actividades`); },
    'ed-save-exit': () => { state.activities.push({ title: e.title || 'Actividad sin título', type: TYPES.find(x => x[0] === e.type)[1], status: 'draft', due: '27 nov, 23:59', subs: 0 }); state.dialog = null; state.editor = null; state.actFilter = 'draft'; toast('Borrador guardado.'); go(`aula/${roomId}/actividades`); },
    'ed-publish': () => { state.dialog = { kind: 'confirm-publish' }; renderDialog(); },
    'publish-go': () => { state.activities.unshift({ title: e.title || 'Cuestionario: partes de la célula', type: TYPES.find(x => x[0] === e.type)[1], status: 'shared', due: '27 nov, 23:59', subs: 0, fresh: true }); state.dialog = null; state.editor = null; state.actFilter = 'shared'; toast('Actividad asignada a Biología 3.° B.'); go(`aula/${roomId}/actividades`); },
  };
  acts[a]?.();
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.matches('[data-search]')) { state.query = t.value; const pos = t.selectionStart; render(); const s = $('[data-search]'); s.focus(); s.setSelectionRange(pos, pos); }
  if (t.matches('[data-wz]') && state.wz) { state.wz[t.dataset.wz] = t.value; state.wz.dirty = true; if (t.type === 'radio') renderWizard(route()[1]); else { const card = $('.wz-preview .room'); if (card) card.outerHTML = roomCard({ id: 'x', name: state.wz.name || 'Tu próxima aula', subject: state.wz.subject || 'Materia', division: state.wz.division || 'Grupo', cover: state.wz.cover, students: 0, taught: 0, total: state.wz.units.reduce((s, u) => s + u.topics.length, 0) }); $('.wz-save').className = 'wz-save dirty'; $('.wz-save').lastChild.textContent = 'Cambios sin guardar'; clearTimeout(state.saveT); state.saveT = setTimeout(() => { state.wz.dirty = false; const s = $('.wz-save'); if (s) { s.className = 'wz-save'; s.lastChild.textContent = 'Borrador guardado'; } }, 650); } }
  if (t.matches('[data-unit]')) state.wz.units[Number(t.dataset.unit)].name = t.value;
  if (t.matches('[data-topic]')) { const [i, j] = t.dataset.topic.split('.').map(Number); state.wz.units[i].topics[j] = t.value; }
  if (t.matches('[data-ed]')) state.editor[t.dataset.ed] = t.value;
  if (t.matches('[data-code]')) state.dialog.code = t.value.toUpperCase();
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.matches('[data-ed-type]')) { state.editor.type = t.dataset.edType; renderEditor(); }
  if (t.matches('[data-ed-foxy]')) { state.editor.foxy = t.dataset.edFoxy === '1'; state.editor.gen = state.editor.foxy ? 'setup' : null; renderEditor(); }
  if (t.matches('[data-ed-topic]')) { const e = state.editor; e.topics = t.checked ? [...e.topics, t.dataset.edTopic] : e.topics.filter(x => x !== t.dataset.edTopic); renderEditor(); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && state.dialog) { state.dialog = null; renderDialog(); } });
$('[data-jump]').addEventListener('change', ev => { state.dialog = null; state.editor = null; state.wz = state.wz && ev.target.value.startsWith('crear') ? state.wz : null; state.consumed = {}; go(ev.target.value); });
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
render();
