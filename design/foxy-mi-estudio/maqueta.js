/* Maqueta navegable de Foxy AI (docente) y Mi estudio (estudiante) en dirección Expedición.
   Datos sintéticos. Las acciones respetan lo que la API ya ofrece; lo nuevo está marcado en «Decisiones para validar». */
const PUB = '../../apps/web/public';
const ICON = `${PUB}/foxmind-3d/icons/sprite.svg`;
const $ = (s, r = document) => r.querySelector(s);
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="${ICON}#${n}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cover = (key, size = 640) => `${PUB}/foxmind-3d/covers/${key}-${size}.webp`;
const FOX = `${PUB}/foxmind-3d/hero/foxy-warm-320.webp`;

/* ---------- Datos sintéticos ---------- */
const UNITS = [
  { id: 'u1', title: 'La luz', topics: [{ id: 't1', title: 'Exposición', level: 2 }, { id: 't2', title: 'Contraste', level: 1 }, { id: 't3', title: 'Temperatura de color', level: 0 }] },
  { id: 'u2', title: 'La cámara', topics: [{ id: 't4', title: 'Apertura y profundidad de campo', level: 3 }, { id: 't5', title: 'Velocidad de obturación', level: 0 }] },
];
const TOPICS = UNITS.flatMap(u => u.topics);
const topicName = id => TOPICS.find(t => t.id === id)?.title ?? id;
const FOLDERS = [
  { id: 'foto', name: 'Fotografía · apuntes', subject: 'Fotografía', year: 2026, cover: 'creative', room: 'Fotografía y luz', practiced: 3, topics: 5, next: 'Jueves 27 · 18:00 · Contraste' },
  { id: 'bio', name: 'Biología · parcial', subject: 'Biología', year: 2026, cover: 'biology', room: null, practiced: 1, topics: 6, next: null },
  { id: 'lit', name: 'Lengua · lectura', subject: 'Lengua', year: 2026, cover: 'literature', room: '3.º B Lengua', practiced: 0, topics: 4, next: null },
];
const MATERIALS = [
  { title: 'Programa de Fotografía y luz', origin: 'Aula', ok: true },
  { title: 'Apunte · exposición.pdf', origin: 'Propio', ok: true },
  { title: 'Ficha técnica.pptx', origin: 'Aula', ok: false },
];
const QUESTIONS = [
  { type: 'SINGLE', topic: 't1', prompt: '¿Qué pasa con la exposición si abrís el diafragma y dejás igual la velocidad?', options: ['Entra más luz y la foto sale más clara.', 'Entra menos luz y la foto sale más oscura.', 'La exposición no cambia.'], right: [0], why: 'Una apertura mayor deja pasar más luz durante el mismo intervalo, así que la luz acumulada aumenta.' },
  { type: 'MULTIPLE', topic: 't2', prompt: 'Elegí las dos afirmaciones correctas sobre el contraste.', options: ['Es la diferencia entre zonas claras y oscuras.', 'Una luz dura suele aumentarlo.', 'Sólo depende del tiempo de exposición.'], right: [0, 1], why: 'El contraste depende de la diferencia de luminosidad, y una luz dura marca más esa diferencia.' },
  { type: 'SINGLE', topic: 't3', prompt: 'Una luz cálida de atardecer tiene una temperatura de color…', options: ['más baja, con tonos anaranjados.', 'más alta, con tonos azulados.', 'igual a la del mediodía.'], right: [0], why: 'Las luces cálidas tienen menos kelvin y tiñen la escena de naranja.' },
  { type: 'SINGLE', topic: 't1', prompt: 'Si duplicás el tiempo de exposición, ¿cuánta luz entra?', options: ['La mitad.', 'El doble.', 'La misma.'], right: [1], why: 'Con la misma apertura, el doble de tiempo acumula el doble de luz.' },
  { type: 'MULTIPLE', topic: 't5', prompt: '¿Qué logra una velocidad de obturación rápida? Elegí dos.', options: ['Congelar el movimiento.', 'Reducir la luz que entra.', 'Aumentar la profundidad de campo.'], right: [0, 1], why: 'Un intervalo corto congela la acción y también deja menos tiempo para que entre luz.' },
];
const CONVERSATIONS = [
  { id: 'c1', title: 'Exposición con ejemplos', when: 'Hoy', topics: ['t1'] },
  { id: 'c2', title: 'Dudas de contraste', when: 'Ayer', topics: ['t2'] },
  { id: 'c3', title: 'Práctica de la unidad 1', when: 'Lunes', topics: ['t1', 't2'] },
];
const STUDENT_CREATIONS = [
  { kind: 'Práctica', title: 'Práctica · La luz', meta: '7 de 10 · Lunes', icon: 'check' },
  { kind: 'Esquema', title: 'Apertura y exposición', meta: 'Domingo', icon: 'progress' },
  { kind: 'Apunte', title: 'Contraste en pocas palabras', meta: 'Viernes', icon: 'book' },
];
const ROOMS = [
  { id: 'r1', name: 'Biología 2.º B', topics: ['Célula', 'Mitosis', 'Meiosis', 'Herencia'] },
  { id: 'r2', name: 'Fotografía y luz', topics: ['Exposición', 'Contraste'] },
];
const TEACHER_CREATIONS = [
  { kind: 'Quiz', title: 'Mitosis · 5 preguntas', meta: 'Biología 2.º B · hoy', icon: 'clipboard', group: 'Actividades' },
  { kind: 'Plan de clase', title: 'Fases de la mitosis · 80 min', meta: 'Biología 2.º B · ayer', icon: 'calendar', group: 'Planificaciones' },
  { kind: 'Apunte', title: 'La célula en tres ideas', meta: 'General · lunes', icon: 'book', group: 'Apuntes' },
  { kind: 'Rúbrica', title: 'Informe de laboratorio', meta: 'Biología 2.º B · 18/11', icon: 'check', group: 'Rúbricas' },
];
const TEACHER_CONVERSATIONS = [
  { id: 'd1', title: 'Quiz de mitosis', when: 'Hoy', ctx: 'Biología 2.º B · Mitosis' },
  { id: 'd2', title: 'Clase sobre fases', when: 'Ayer', ctx: 'Biología 2.º B' },
  { id: 'd3', title: 'Ideas para explicar la célula', when: 'Lunes', ctx: 'General' },
];
const STUDENT_TOOLS = {
  EXPLANATION: { label: 'Entender un tema', hint: 'Foxy te lo explica con un ejemplo', icon: 'chat', tone: 'lake', cta: 'Pedir explicación' },
  QUIZ: { label: 'Practicar', hint: 'Preguntas con devolución al momento', icon: 'check', tone: 'pine', cta: 'Preparar práctica' },
  MOCK_EXAM: { label: 'Preparar un examen', hint: 'Un simulacro como el de verdad', icon: 'clipboard', tone: '', cta: 'Preparar simulacro' },
  PLAN: { label: 'Organizar mi repaso', hint: 'Sesiones en tu Agenda hasta la fecha', icon: 'calendar', tone: 'sun', cta: 'Armar mi repaso' },
  NOTE: { label: 'Apunte', icon: 'book', cta: 'Preparar apunte' },
  OUTLINE: { label: 'Esquema', icon: 'progress', cta: 'Preparar esquema' },
  EXERCISE: { label: 'Ejercicios', icon: 'edit', cta: 'Preparar ejercicios' },
  IMAGE: { label: 'Imagen', icon: 'eye', cta: 'Crear imagen' },
};
const TEACHER_TOOLS = {
  PLAN: { label: 'Plan de clase', hint: 'Una secuencia con tiempos', icon: 'calendar', group: 'class', cta: 'Preparar plan' },
  ACTIVITY: { label: 'Actividad', hint: 'Consignas listas para el aula', icon: 'edit', group: 'class', cta: 'Preparar actividad' },
  QUIZ: { label: 'Quiz', hint: 'Preguntas con distractores', icon: 'clipboard', group: 'class', cta: 'Preparar quiz' },
  RUBRIC: { label: 'Rúbrica', hint: 'Criterios y niveles de logro', icon: 'check', group: 'class', cta: 'Preparar rúbrica' },
  NOTE: { label: 'Apunte', hint: 'Explicación con ejemplos', icon: 'book', group: 'explain', cta: 'Preparar apunte' },
  DIAGRAM: { label: 'Esquema', hint: 'Ideas y relaciones', icon: 'progress', group: 'explain', cta: 'Preparar esquema' },
};

/* ---------- Estado ---------- */
const fresh = () => ({
  topics: ['t2'], tool: null, toolOpts: { count: 5, level: 'Intermedia', format: 'Opción múltiple' }, draft: '',
  messages: [], waiting: null, panel: null, practice: null, review: null, dialog: null, railOpen: false,
  noMaterial: false, tab: 'activas', ctx: { mode: 'room', room: 'r1', topics: ['Mitosis'] }, creationsTab: 'Todas', editing: false,
});
const state = { role: 'student', ...fresh() };
let returnFocus = null;
// Preferencia de la persona: sobrevive a los saltos de la maqueta (en el producto, por usuario).
const prefs = { railCollapsed: false };

/* ---------- Rutas ---------- */
const route = () => (location.hash.slice(2) || 'estudio').split('?');
const go = h => { if (location.hash === `#/${h}`) render(); else location.hash = `#/${h}`; };
const JUMPS = () => state.role === 'student'
  ? [['Mi estudio', [['estudio', 'Mis carpetas'], ['estudio?vacio', 'Mis carpetas · sin carpetas'], ['estudio/nueva/1', 'Crear carpeta · 1 Tu carpeta'], ['estudio/nueva/2', 'Crear carpeta · 2 El programa'], ['estudio/nueva/3', 'Crear carpeta · 3 El recorrido'], ['estudio/nueva/4', 'Crear carpeta · 4 Todo listo']]],
     ['Dentro de la carpeta', [['carpeta/foto', 'Mesa de trabajo (inicio)'], ['carpeta/foto?conversacion', 'Conversación con fuentes'], ['carpeta/foto?sin-material', 'Sin material legible'], ['carpeta/foto?historial', 'Historial'], ['carpeta/foto?creaciones', 'Mis creaciones'], ['carpeta/foto?materiales', 'Materiales']]],
     ['Flujos', [['carpeta/foto?practicar', 'Practicar · formulario'], ['carpeta/foto?esperando', 'Practicar · preparando'], ['carpeta/foto?practica', 'Practicar · pregunta'], ['carpeta/foto?resultado', 'Practicar · resultado'], ['carpeta/foto?repaso', 'Organizar mi repaso'], ['carpeta/foto?repaso-propuesta', 'Organizar mi repaso · propuesta']]]]
  : [['Foxy AI', [['foxy', 'Inicio de Foxy'], ['foxy?contexto', 'Elegir contexto'], ['foxy?historial', 'Historial'], ['foxy?creaciones', 'Creaciones']]],
     ['Flujos', [['foxy?quiz', 'Quiz · formulario'], ['foxy?esperando', 'Quiz · preparando'], ['foxy?resultado', 'Quiz · propuesta en la mesa'], ['foxy?llevar', 'Llevar al aula'], ['foxy?plan', 'Plan de clase con tiempos']]]];

const NOTES = {
  student: [
    ['Una sola puerta por acción', 'Hoy Practicar aparece en la bienvenida, en Herramientas, en los chips y en el riel. La maqueta deja cuatro intenciones grandes al empezar (Entender, Practicar, Preparar un examen, Organizar mi repaso) y el resto en «Más herramientas». Los chips sueltos y las herramientas del riel se quitan.'],
    ['Herramientas siempre a mano', 'Un botón «Herramientas» en la cabecera, junto a Historial, Creaciones y Nuevo chat, abre el mismo catálogo en un menú. Hoy, después del primer mensaje, la bienvenida desaparece y no queda forma de llegar a una herramienta. El menú usa los temas elegidos y se maneja con flechas y Escape.'],
    ['Riel plegable', 'El panel de la carpeta (temas, próximo repaso, materiales) se pliega a una tira con lo esencial para darle el ancho al chat. La tira muestra cuántos temas hay elegidos y abre repaso y materiales sin desplegar. <b>Por definir:</b> si la preferencia se recuerda por persona (la maqueta la conserva entre pantallas).'],
    ['Un solo cuadro de texto', 'El formulario de la herramienta se monta sobre el composer y usa su mismo campo. Hoy el diálogo de Practicar abre un segundo cuadro encima del chat.'],
    ['Temas visibles al escribir', 'Los temas elegidos en el riel aparecen como fichas dentro del composer y se pueden quitar ahí. Hoy la selección sólo se ve en el riel.'],
    ['El aviso de material va primero', 'Si no hay fuentes legibles, la carpeta lo dice arriba del composer antes de que completes nada. Hoy se descubre al final del formulario, con el botón apagado. <b>Revisar:</b> en la carpeta vinculada sintética, el plan del aula no contó como fuente (0 materiales).'],
    ['Cantidad y dificultad como botones', '5, 10 o 15 preguntas y tres niveles, en lugar de un campo numérico libre y un desplegable. El límite de la API (1 a 30) se conserva.'],
    ['Práctica en la mesa', 'La práctica se abre en el panel lateral (hoja inferior en móvil) con una pregunta por pantalla, confirmación por pregunta y devolución al momento, como ya hace hoy. Suma un sendero de colores para saltar entre preguntas.'],
    ['Resultado con siguiente paso', '«Practicar lo que falló» y «Organizar mi repaso» al final del resultado. <b>Dato nuevo:</b> practicar sólo lo que falló requiere que GENERATE reciba esos temas; hoy ya acepta topicIds, así que no hace falta API nueva.'],
    ['Repaso en tres pasos', 'Fecha, temas y disponibilidad, y después la propuesta con conflictos marcados. Agregar a Agenda pide confirmación, igual que hoy.'],
    ['«Seguí donde quedaste» y avance por carpeta', '<b>Dato nuevo:</b> la lista de carpetas no trae temas practicados ni próximo repaso. Mostrarlo exige sumar esos campos al resumen de la colección o cargar cada carpeta. Decidí si vale el cambio de API.'],
    ['Crear carpeta: una pregunta por paso', 'El paso 2 pregunta sólo de dónde sale el recorrido (aula, programa o a mano). Si tenés una sola aula, queda elegida. «Armarlo a mano» no exige subir un archivo.'],
    ['Cabecera sin duplicados', 'El nombre de la carpeta queda en el riel; la cabecera del chat muestra la conversación y las acciones.'],
  ],
  teacher: [
    ['Contexto a la vista', 'La cabecera dice «Trabajando con Biología 2.º B · Mitosis» en vez de «Contexto general» con una flecha. El diálogo deja elegir General, aula completa o temas puntuales en un solo lugar.'],
    ['Herramientas agrupadas por intención', '«Para tu clase» (Plan, Actividad, Quiz, Rúbrica) y «Para explicar» (Apunte, Esquema). Se quitan las dos sugerencias sueltas, que llevaban a lo mismo.'],
    ['Herramientas siempre a mano', 'El botón «Herramientas» de la cabecera abre el mismo catálogo agrupado en un menú, así se puede pedir un Quiz o una Rúbrica en medio de la charla. Hoy el acceso se pierde después del primer mensaje.'],
    ['Un solo cuadro de texto', 'El formulario del Quiz se monta sobre el composer. Hoy aparecen dos cuadros a la vez y no queda claro cuál envía.'],
    ['Sin formato dentro del Quiz', 'Hoy el formulario de Quiz ofrece «Trabajo práctico | Quiz». La maqueta usa «Formato de preguntas» (opción múltiple, verdadero o falso, mixto). <b>Por definir:</b> los formatos que la API acepta hoy.'],
    ['Retomá', 'El inicio lista las tres últimas creaciones y conversaciones. Los datos ya existen en Creaciones e Historial.'],
    ['Propuesta en la mesa', 'La respuesta deja una tarjeta en el chat y abre la propuesta en el panel con Editar, Descargar y «Llevar al aula».'],
    ['Llevar al aula', 'Un solo diálogo: aula, destino (Biblioteca o borrador de actividad) y temas. Es el traspaso que ya existe; sólo cambia el punto de entrada.'],
    ['Plan de clase con tiempos', 'Se conserva la barra de tiempos del plan (inicio, desarrollo, cierre).'],
  ],
};

/* ---------- Render ---------- */
function render() {
  const [path, flag] = route();
  const parts = path.split('/');
  const wantRole = parts[0] === 'foxy' ? 'teacher' : 'student';
  // Cada salto de la maqueta arranca limpio; el asistente conserva su borrador entre pasos.
  if (state.consumed !== location.hash) {
    const wz = state.wz;
    Object.assign(state, fresh(), { role: wantRole, wz: parts[1] === 'nueva' ? wz : null, consumed: location.hash, empty: false });
    if (flag) applyFlag(flag);
  }
  document.querySelectorAll('[data-role]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === state.role)));
  const jump = $('[data-jump]');
  jump.innerHTML = JUMPS().map(([g, items]) => `<optgroup label="${g}">${items.map(([h, l]) => `<option value="${h}" ${`#/${h}` === location.hash ? 'selected' : ''}>${l}</option>`).join('')}</optgroup>`).join('');
  $('[data-notes-panel]').innerHTML = `<h2>Decisiones para validar</h2><ol>${NOTES[state.role].map(([t, d]) => `<li><b>${t}:</b> ${d}</li>`).join('')}</ol>`;
  const teacher = state.role === 'teacher';
  $('[data-nav]').innerHTML = [['home', 'Inicio'], ['book', 'Mis aulas'], teacher ? ['spark', 'Foxy AI', true] : ['folder', 'Mi estudio', true], ['calendar', 'Agenda'], ['bell', 'Notificaciones']]
    .map(([i, l, cur]) => `<a href="${cur ? (teacher ? '#/foxy' : '#/estudio') : '#'}" ${cur ? 'aria-current="page"' : ''}>${icon(i)}${l}</a>`).join('');
  $('[data-me]').innerHTML = `<span class="avatar" style="background:#ffc94d;color:#1b3a52">${teacher ? 'LD' : 'MD'}</span><span><strong>${teacher ? 'Lucía Demo' : 'Marina Demo'}</strong><small>${teacher ? 'Docente' : 'Estudiante'}</small></span>`;
  const view = $('[data-view]');
  document.body.classList.toggle('desk-page', parts[0] === 'carpeta' || parts[0] === 'foxy');
  if (parts[0] === 'estudio' && parts[1] === 'nueva') { view.innerHTML = collectionView(); renderWizard(+parts[2] || 1); }
  else if (parts[0] === 'estudio') { view.innerHTML = collectionView(); renderOverlay(); }
  else { view.innerHTML = deskView(); renderOverlay(); bindDesk(); }
  document.title = teacher ? 'Foxy AI · maqueta Expedición' : 'Mi estudio · maqueta Expedición';
}

function applyFlag(flag) {
  const s = state;
  if (flag === 'vacio') s.empty = true;
  if (flag === 'conversacion') seedConversation();
  if (flag === 'sin-material') s.noMaterial = true;
  if (flag === 'historial') s.panel = 'history';
  if (flag === 'creaciones') s.panel = 'creations';
  if (flag === 'materiales') s.dialog = { kind: 'materials' };
  if (flag === 'practicar') { s.tool = 'QUIZ'; s.topics = ['t1', 't2']; }
  if (flag === 'esperando') { s.topics = ['t1', 't2']; startWait(s.role === 'teacher' ? 'QUIZ' : 'QUIZ', true); }
  if (flag === 'practica') { seedPracticeMessage(); openPractice(); }
  if (flag === 'resultado' && s.role === 'student') { seedPracticeMessage(); openPractice(); Object.assign(s.practice, { index: 5, answers: { 0: [0], 1: [0], 2: [1], 3: [1], 4: [0, 1] }, confirmed: [0, 1, 2, 3, 4], done: true }); }
  if (flag === 'repaso') { s.panel = 'review'; s.review = { step: 1, date: '2026-12-04', topics: ['t2', 't3', 't5'], days: [1, 3, 5], minutes: 45 }; }
  if (flag === 'repaso-propuesta') { s.panel = 'review'; s.review = { step: 4, date: '2026-12-04', topics: ['t2', 't3', 't5'], days: [1, 3, 5], minutes: 45 }; }
  if (flag === 'contexto') s.dialog = { kind: 'context', mode: 'room', room: 'r1', topics: ['Mitosis'] };
  if (flag === 'quiz') s.tool = 'QUIZ';
  if (flag === 'resultado' && s.role === 'teacher') { seedTeacherResult(); }
  if (flag === 'llevar') { seedTeacherResult(); s.dialog = { kind: 'handoff', step: 0, room: 'r1', dest: 'library' }; }
  if (flag === 'plan') { seedTeacherPlan(); }
}

/* ---------- Mi estudio · colección ---------- */
function collectionView() {
  const s = state;
  const list = s.empty ? [] : FOLDERS;
  const counts = { activas: list.length, borradores: s.empty ? 0 : 1, archivadas: 0 };
  const resume = list[0];
  return `
  <section class="banner" aria-labelledby="st-title">
    <div>
      <span class="kicker">Tus carpetas de estudio</span>
      <h1 id="st-title">Mi estudio</h1>
      <p>Guardá tu programa, practicá con Foxy y organizá tu repaso, tema por tema.</p>
      <div class="actions"><a class="btn primary" href="#/estudio/nueva/1">${icon('plus')}Crear carpeta</a></div>
    </div>
  </section>
  ${resume ? `<section class="resume" aria-label="Seguí donde quedaste">
    <img src="${cover(resume.cover, 320)}" alt="">
    <div><small>Seguí donde quedaste</small><strong>${esc(resume.name)}</strong>
      <div class="next"><span class="chip sun">${icon('clock')}Repaso ${esc(resume.next)}</span><span class="chip orange">Tema más flojo: Contraste</span></div></div>
    <a class="btn secondary" href="#/carpeta/foto">Abrir carpeta${icon('arrow-right')}</a>
  </section>` : ''}
  <div class="toolbar">
    <div class="seg-tabs" role="group" aria-label="Estado de las carpetas">
      ${[['activas', 'Activas'], ['borradores', 'Borradores'], ['archivadas', 'Archivadas']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${s.tab === k}">${l}<span class="count">${counts[k]}</span></button>`).join('')}
    </div>
    <label class="search"><span class="sr">Buscar carpeta</span>${icon('search')}<input class="input" type="search" placeholder="Buscar carpeta"></label>
    <button type="button" class="btn quiet sm" data-dialog="filters">${icon('filter')}Filtros</button>
  </div>
  ${s.tab === 'activas' && list.length ? `<div class="grid">${list.map(folderCard).join('')}</div>`
    : s.tab === 'borradores' && counts.borradores ? `<div class="grid">${draftCard()}</div>`
    : `<div class="panel empty"><img src="${PUB}/foxmind-3d/states/empty-320.webp" alt=""><h2>${s.tab === 'activas' ? 'Todavía no tenés carpetas' : s.tab === 'borradores' ? 'No tenés borradores' : 'No archivaste carpetas'}</h2><p>${s.tab === 'activas' ? 'Creá una carpeta para guardar tu programa y practicar tema por tema.' : 'Cuando guardes una carpeta sin terminar, la vas a encontrar acá.'}</p>${s.tab === 'activas' ? `<a class="btn primary" href="#/estudio/nueva/1">${icon('plus')}Crear carpeta</a>` : ''}</div>`}`;
}
function folderCard(f) {
  const bar = Array.from({ length: f.topics }, (_, i) => `<i class="${i < f.practiced ? 'on' : ''}"></i>`).join('');
  return `<article class="card">
    <div class="cover" style="background-image:url('${cover(f.cover)}')"><span class="chip">${icon('lock')}Privada</span></div>
    <div class="body">
      <h3>${esc(f.name)}</h3>
      <span class="meta">${esc(f.subject)} · ${f.year}</span>
      ${f.room ? `<span class="chip pine" style="justify-self:start">${icon('link')}${esc(f.room)}</span>` : `<span class="chip muted" style="justify-self:start">Materiales propios</span>`}
      <div class="trail"><div class="bar" aria-hidden="true">${bar}</div><small>${f.practiced} de ${f.topics} temas practicados</small></div>
      <div class="foot">${f.next ? `<span class="chip sun">${icon('clock')}${esc(f.next.split(' · ').slice(0, 2).join(' · '))}</span>` : '<span></span>'}
        <a class="btn secondary sm" href="#/carpeta/foto" aria-label="Abrir ${esc(f.name)}">Abrir${icon('arrow-right')}</a></div>
    </div></article>`;
}
function draftCard() {
  return `<article class="card"><div class="cover" style="background-image:url('${cover('science')}')"><span class="chip sun">Borrador</span></div>
    <div class="body"><h3>Química · sin nombre</h3><span class="meta">Paso 2 de 4 · guardado ayer</span>
    <div class="foot"><button class="link" type="button">${icon('trash')}Eliminar borrador</button><a class="btn secondary sm" href="#/estudio/nueva/2">Retomar${icon('arrow-right')}</a></div></div></article>`;
}

/* ---------- Crear carpeta ---------- */
const WZ = [['Tu carpeta', 'Nombre, materia y portada'], ['El programa', 'De dónde sale tu recorrido'], ['El recorrido', 'Unidades y temas'], ['Todo listo', 'Revisá y creá']];
const COVERS = [['creative', 'Arte y creatividad'], ['science', 'Ciencia y tecnología'], ['math', 'Matemática'], ['biology', 'Biología'], ['literature', 'Literatura'], ['society', 'Sociedad'], ['general', 'General']];
function renderWizard(step) {
  const w = state.wz ??= { name: 'Fotografía · apuntes', subject: 'Fotografía', cover: 'creative', origin: 'room' };
  const body = [wzIdentity, wzOrigin, wzPath, wzReview][step - 1](w);
  $('[data-overlay]').innerHTML = `<div class="scrim wz"><div class="wizard" role="dialog" aria-modal="true" aria-labelledby="wz-h">
    <aside class="wz-rail"><h2>Crear una carpeta</h2>${WZ.map(([t, d], i) => `<div class="stop ${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}" ${i + 1 === step ? 'aria-current="step"' : ''}><span class="n">${i + 1 < step ? icon('check') : i + 1}</span><span><strong>${t}</strong><small>${d}</small></span></div>`).join('')}</aside>
    <section class="wz-stage"><div class="scroll"><div><span class="kicker" style="color:var(--orange-ink);font-weight:900;font-size:13px">Paso ${step} de 4</span><h3 id="wz-h" tabindex="-1">${['Dale identidad a tu carpeta', '¿De dónde sale tu recorrido?', 'Tu recorrido, a tu manera', 'Tu carpeta está a un paso'][step - 1]}</h3></div>${body}</div>
      <footer><a class="btn quiet" href="#/estudio">${icon('check')}Guardar y salir</a><span class="spacer"></span>${step > 1 ? `<a class="btn secondary" href="#/estudio/nueva/${step - 1}">Atrás</a>` : ''}${step < 4 ? `<a class="btn primary" href="#/estudio/nueva/${step + 1}">${step === 2 && w.origin !== 'manual' ? 'Revisar mi recorrido' : 'Continuar'}${icon('arrow-right')}</a>` : `<button type="button" class="btn primary" data-create>${icon('check')}Crear carpeta</button>`}</footer>
    </section>
    <aside class="wz-preview"><h4>Así se va a ver</h4>${folderCard({ ...FOLDERS[0], name: w.name || 'Tu próxima carpeta', subject: w.subject || 'Materia', cover: w.cover, room: w.origin === 'room' ? 'Fotografía y luz' : null, practiced: 0, next: null })}</aside>
  </div></div>`;
  $('#wz-h').focus();
  $('[data-overlay]').onclick = e => {
    const c = e.target.closest('[data-cover]'); if (c) { w.cover = c.dataset.cover; renderWizard(step); }
    const o = e.target.closest('[data-origin]'); if (o) { w.origin = o.dataset.origin; renderWizard(step); }
    if (e.target.closest('[data-create]')) { state.wz = null; toast('Creaste «Fotografía · apuntes». Ya podés practicar.'); go('carpeta/foto'); }
  };
  $('[data-overlay]').oninput = e => { if (e.target.name) w[e.target.name] = e.target.value; const p = $('.wz-preview h3'); if (p && e.target.name === 'name') p.textContent = e.target.value || 'Tu próxima carpeta'; };
}
const wzIdentity = w => `<p class="lead">Elegí cómo vas a reconocerla en Mi estudio.</p>
  <div class="field"><label for="wz-name">Nombre de la carpeta</label><input id="wz-name" name="name" class="input" value="${esc(w.name)}" placeholder="Por ejemplo: Fotografía y luz"></div>
  <div class="fields2"><div class="field"><label for="wz-sub">Materia</label><input id="wz-sub" name="subject" class="input" value="${esc(w.subject)}"></div><div class="field"><label for="wz-year">Año</label><input id="wz-year" class="input" value="2026" inputmode="numeric"></div></div>
  <fieldset style="border:0;margin:0;padding:0"><legend class="lbl" style="font-weight:800;margin-bottom:8px">Una portada para reconocerla</legend><div class="covers">${COVERS.map(([k, l]) => `<button type="button" data-cover="${k}" aria-pressed="${w.cover === k}"><img src="${cover(k, 320)}" alt="">${l}</button>`).join('')}</div></fieldset>`;
const wzOrigin = w => `<p class="lead">Elegí un punto de partida. Vas a poder editar unidades y temas en el paso siguiente.</p>
  <div class="origin" role="group" aria-label="Origen del recorrido">
    <button type="button" data-origin="room" aria-pressed="${w.origin === 'room'}"><span class="ic">${icon('users')}</span><strong>Del aula</strong><span>Copiá el plan de Fotografía y luz y consultá sus materiales.</span></button>
    <button type="button" data-origin="file" aria-pressed="${w.origin === 'file'}"><span class="ic">${icon('upload')}</span><strong>De mi programa</strong><span>Subí un PDF, Word o PowerPoint y Foxy propone el recorrido.</span></button>
    <button type="button" data-origin="manual" aria-pressed="${w.origin === 'manual'}"><span class="ic">${icon('edit')}</span><strong>A mano</strong><span>Escribí vos las unidades y los temas.</span></button>
  </div>
  ${w.origin === 'room' ? `<div class="ok-box">${icon('check')}<span><b>Fotografía y luz</b> es tu única aula, así que ya quedó elegida. Su plan tiene 1 unidad y 2 temas.</span></div>` : ''}
  ${w.origin === 'file' ? `<div class="drop">${icon('upload')}<strong>Arrastrá o seleccioná tu programa</strong><small>PDF, Word o PowerPoint · hasta 20 MB</small><button type="button" class="btn secondary sm">Seleccionar archivo</button></div>` : ''}
  ${w.origin === 'manual' ? `<div class="ok-box">${icon('check')}<span>Empezás con una unidad vacía. Podés subir tu programa más tarde desde Materiales.</span></div>` : ''}`;
const wzPath = () => `<p class="lead">El orden de las unidades es el orden en que vas a estudiar.</p>
  ${UNITS.map((u, i) => `<div class="unit-edit"><div class="row"><span class="chip orange">0${i + 1}</span><label class="sr" for="u${i}">Unidad ${i + 1}</label><input id="u${i}" class="input" value="${esc(u.title)}"><button type="button" class="icon-btn" aria-label="Quitar unidad ${i + 1}">${icon('trash')}</button></div>
    <ul>${u.topics.map((t, j) => `<li><label class="sr" for="u${i}t${j}">Tema ${j + 1} de la unidad ${i + 1}</label><input id="u${i}t${j}" class="input" value="${esc(t.title)}"><button type="button" class="icon-btn" aria-label="Quitar ${esc(t.title)}">${icon('close')}</button></li>`).join('')}</ul>
    <button type="button" class="link">${icon('plus')}Agregar tema</button></div>`).join('')}
  <button type="button" class="btn secondary sm" style="justify-self:start">${icon('plus')}Agregar unidad</button>`;
const wzReview = w => `<p class="lead">Revisá los detalles. Podés volver a cualquier paso.</p>
  <div class="review-list">
    <div><span><small>Carpeta</small><b>${esc(w.name)}</b> · ${esc(w.subject)} · 2026</span><a class="btn quiet sm" href="#/estudio/nueva/1">${icon('edit')}Editar</a></div>
    <div><span><small>Recorrido</small><b>${w.origin === 'room' ? 'Del aula Fotografía y luz' : w.origin === 'file' ? 'De tu programa' : 'A mano'}</b> · 2 unidades · 5 temas</span><a class="btn quiet sm" href="#/estudio/nueva/3">${icon('edit')}Editar</a></div>
  </div>
  <div class="ok-box">${icon('lock')}<span>Sólo vos ves esta carpeta, sus materiales y tus conversaciones.</span></div>`;

/* ---------- Mesa de trabajo ---------- */
function deskView() {
  const s = state, teacher = s.role === 'teacher';
  const hasPanel = !!s.panel;
  if (!hasPanel) s.lastPanel = null;
  return `<div class="desk ${teacher ? 'no-rail' : ''} ${hasPanel ? 'with-panel' : ''} ${s.railOpen ? 'rail-open' : ''} ${!teacher && prefs.railCollapsed ? 'rail-min' : ''}">
    ${teacher ? '' : railView() + railMini()}
    <section class="chat" aria-label="${teacher ? 'Conversación con Foxy' : 'Conversación de estudio'}">
      ${chatHead()}
      <div class="msgs" data-msgs aria-live="polite">${s.messages.length || s.waiting ? s.messages.map(msgView).join('') + (s.waiting ? waitView() : '') : welcomeView()}</div>
      <div class="composer-wrap">${s.noMaterial && !teacher ? materialAlert() : ''}${s.tool ? toolForm() : ''}${composerView()}<p class="disclaimer">Foxy puede equivocarse. Revisá sus propuestas.</p></div>
    </section>
    ${hasPanel ? panelView() : ''}
  </div>${s.railOpen ? '<div class="sheet-scrim" data-close-rail></div>' : ''}${hasPanel ? '<div class="sheet-scrim panel-scrim" data-close-panel></div>' : ''}`;
}
function railView() {
  const s = state;
  return `<aside class="rail" aria-label="Tu carpeta">
    <div class="rail-id"><img src="${cover('creative', 320)}" alt=""><span><strong>Fotografía · apuntes</strong><small>${icon('link', 'i')} Fotografía y luz</small></span><button type="button" class="icon-btn" aria-label="Opciones de la carpeta">${icon('more')}</button><button type="button" class="icon-btn rail-fold desktop-only" data-rail-fold aria-expanded="true" aria-controls="rail-mini" aria-label="Plegar el panel de la carpeta">${icon('chevron-right')}</button></div>
    <section aria-labelledby="rt"><h3 id="rt">Temas <button type="button" class="link" data-all style="font-size:12px;text-transform:none;letter-spacing:0">${s.topics.length === TOPICS.length ? 'Quitar todos' : 'Elegir todos'}</button></h3>
      <p class="hint">Elegí sobre qué querés trabajar. Foxy usa esos temas en tu próximo pedido.</p>
      ${UNITS.map(u => `<h4>${esc(u.title)}</h4>${u.topics.map(t => `<button type="button" class="topic" data-topic="${t.id}" aria-pressed="${s.topics.includes(t.id)}"><span class="box">${icon('check')}</span><span class="t">${esc(t.title)}</span>${t.level ? `<span class="meter" role="img" aria-label="Dominio ${['', 'inicial', 'en progreso', 'logrado'][t.level]}">${[1, 2, 3].map(n => `<i class="${n <= t.level ? 'on' : ''}"></i>`).join('')}</span>` : '<span class="unpracticed">Sin practicar</span>'}</button>`).join('')}`).join('')}
    </section>
    <section aria-labelledby="rr"><h3 id="rr">Próximo repaso</h3><div class="review-card"><b>Jueves 27 · 18:00</b><span>Contraste · 45 min</span></div>
      <button type="button" class="link" data-open-review style="margin-top:8px">${icon('calendar')}Organizar mi repaso</button></section>
    <section aria-labelledby="rm"><h3 id="rm">Materiales <span class="count" style="background:#e8eff4">${s.noMaterial ? 0 : 3}</span></h3>
      ${s.noMaterial ? '<p class="hint">Todavía no hay material legible.</p>' : MATERIALS.slice(0, 2).map(m => `<div class="mat">${icon('file')}<span>${esc(m.title)}</span></div>`).join('')}
      <button type="button" class="btn secondary sm" data-dialog="materials">${icon(s.noMaterial ? 'plus' : 'folder')}${s.noMaterial ? 'Agregar material' : 'Ver materiales'}</button></section>
    <div class="rail-done mobile-only"><button type="button" class="btn primary" data-close-rail>${icon('check')}Listo · ${s.topics.length} ${s.topics.length === 1 ? 'tema' : 'temas'}</button></div>
  </aside>`;
}
// Riel plegado: una tira con lo esencial para que el chat gane espacio sin perder el contexto.
function railMini() {
  const s = state;
  return `<aside class="rail-mini" id="rail-mini" aria-label="Tu carpeta (plegada)">
    <button type="button" class="mini-btn" data-rail-fold aria-expanded="false" aria-label="Desplegar el panel de la carpeta">${icon('chevron-right')}</button>
    <img src="${cover('creative', 320)}" alt="" title="Fotografía · apuntes">
    <button type="button" class="mini-btn" data-rail-fold data-rail-focus="topic" aria-label="Temas: ${s.topics.length} elegidos. Desplegar para cambiarlos">${icon('book')}<span class="count">${s.topics.length}</span><small>Temas</small></button>
    <button type="button" class="mini-btn" data-open-review aria-label="Próximo repaso: jueves 27, 18:00. Organizar mi repaso">${icon('calendar')}<small>Repaso</small></button>
    <button type="button" class="mini-btn" data-dialog="materials" aria-label="Materiales: ${s.noMaterial ? 0 : 3}">${icon('folder')}<span class="count">${s.noMaterial ? 0 : 3}</span><small>Material</small></button>
  </aside>`;
}
// Herramientas siempre a mano: el mismo catálogo que la bienvenida, disponible en cualquier momento de la charla.
function toolsMenu() {
  const s = state, teacher = s.role === 'teacher';
  const item = (k, t) => `<button type="button" role="menuitem" class="tm-item" data-tool="${k}" ${s.tool === k ? 'aria-current="true"' : ''}><span class="ic">${icon(t.icon)}</span><span><strong>${t.label}</strong>${t.hint ? `<small>${t.hint}</small>` : ''}</span>${s.tool === k ? '<span class="chip">En uso</span>' : ''}</button>`;
  const groups = teacher
    ? [['Para tu clase', Object.entries(TEACHER_TOOLS).filter(([, t]) => t.group === 'class')], ['Para explicar', Object.entries(TEACHER_TOOLS).filter(([, t]) => t.group === 'explain')]]
    : [['Para estudiar', ['EXPLANATION', 'QUIZ', 'MOCK_EXAM', 'PLAN'].map(k => [k, STUDENT_TOOLS[k]])], ['Más herramientas', ['NOTE', 'OUTLINE', 'EXERCISE', 'IMAGE'].map(k => [k, STUDENT_TOOLS[k]])]];
  return `<div class="tools-menu" role="menu" id="tools-menu" aria-label="Herramientas">
    ${groups.map(([g, list]) => `<div class="tm-group" role="group" aria-label="${g}"><h3 aria-hidden="true">${g}</h3>${list.map(([k, t]) => item(k, t)).join('')}</div>`).join('')}
    <p class="tm-foot">${teacher ? `Usa el contexto actual: ${esc(ctxLabel().strong)}` : `Usa tus temas elegidos: ${s.topics.length ? s.topics.map(topicName).join(', ') : 'todos'}`}</p>
  </div>`;
}
function chatHead() {
  const s = state, teacher = s.role === 'teacher';
  const ctx = teacher ? ctxLabel() : { small: 'Conversación', strong: s.messages.length ? 'Exposición con ejemplos' : 'Nueva conversación' };
  const creations = teacher ? TEACHER_CREATIONS.length : STUDENT_CREATIONS.length;
  return `<header class="chat-head">
    ${teacher ? '' : `<a class="icon-btn" href="#/estudio" aria-label="Volver a Mi estudio">${icon('arrow-left')}</a><button type="button" class="head-btn mobile-only" data-rail aria-expanded="${s.railOpen}">${icon('book')}<span>Temas</span><span class="count">${s.topics.length}</span></button>`}
    <button type="button" class="ctx-btn ${teacher ? '' : 'conv'}" ${teacher ? 'data-dialog="context"' : 'data-rename'} aria-label="${teacher ? `Cambiar contexto: ${ctx.strong}` : `Renombrar conversación: ${ctx.strong}`}"><span class="ic">${icon(teacher ? 'users' : 'chat')}</span><span><small>${ctx.small}</small><strong>${esc(ctx.strong)}</strong></span>${icon(teacher ? 'chevron-down' : 'edit')}</button>
    <div class="tools">
      <span class="tm-wrap"><button type="button" class="head-btn tools-btn" data-tools-menu aria-haspopup="menu" aria-controls="tools-menu" aria-expanded="${!!s.toolsMenu}">${icon('spark')}<span class="lbl">Herramientas</span>${icon('chevron-down')}</button>${s.toolsMenu ? toolsMenu() : ''}</span>
      <button type="button" class="head-btn" data-panel="history" aria-expanded="${s.panel === 'history'}">${icon('clock')}<span class="lbl">Historial</span></button>
      <button type="button" class="head-btn" data-panel="creations" aria-expanded="${s.panel === 'creations'}">${icon('folder')}<span class="lbl">Creaciones</span><span class="count">${creations}</span></button>
      <button type="button" class="head-btn new" data-new>${icon('plus')}<span class="lbl">Nuevo chat</span></button>
    </div></header>`;
}
function ctxLabel() {
  const c = state.ctx;
  if (c.mode === 'general') return { small: 'Trabajando con', strong: 'Ideas generales · tu biblioteca' };
  const room = ROOMS.find(r => r.id === c.room);
  return { small: 'Trabajando con', strong: c.mode === 'topics' || c.topics?.length ? `${room.name} · ${c.topics.join(', ')}` : `${room.name} · aula completa` };
}
function welcomeView() {
  const s = state;
  if (s.role === 'teacher') {
    const group = g => Object.entries(TEACHER_TOOLS).filter(([, t]) => t.group === g).map(([k, t]) => `<button type="button" class="intent ${g === 'class' ? '' : 'lake'}" data-tool="${k}"><span class="ic">${icon(t.icon)}</span><strong>${t.label}</strong><span>${t.hint}</span></button>`).join('');
    return `<div class="welcome"><img src="${FOX}" alt=""><h2>¿Qué preparamos hoy?</h2><p>Elegí qué necesitás o escribile a Foxy. Vas a revisar todo antes de llevarlo al aula.</p>
      <div class="intent-group"><h3>Para tu clase</h3><div class="intents">${group('class')}</div></div>
      <div class="intent-group"><h3>Para explicar</h3><div class="intents">${group('explain')}</div></div>
      <div class="recent"><h3>Retomá</h3>${TEACHER_CREATIONS.slice(0, 3).map(c => `<button type="button" data-open-creation>${icon(c.icon)}${esc(c.title)}<small>${esc(c.meta)}</small></button>`).join('')}</div></div>`;
  }
  const main = ['EXPLANATION', 'QUIZ', 'MOCK_EXAM', 'PLAN'];
  return `<div class="welcome"><img src="${FOX}" alt=""><h2>¿Qué hacemos hoy?</h2><p>Elegí los temas en el riel y contame qué necesitás. Foxy usa tus materiales y los del aula.</p>
    <div class="intents">${main.map(k => { const t = STUDENT_TOOLS[k]; return `<button type="button" class="intent ${t.tone}" data-tool="${k}"><span class="ic">${icon(t.icon)}</span><strong>${t.label}</strong><span>${t.hint}</span></button>`; }).join('')}</div>
    <div class="more-tools" role="group" aria-label="Más herramientas"><span>Más herramientas</span>${['NOTE', 'OUTLINE', 'EXERCISE', 'IMAGE'].map(k => `<button type="button" class="tool-chip" data-tool="${k}">${icon(STUDENT_TOOLS[k].icon)}${STUDENT_TOOLS[k].label}</button>`).join('')}</div></div>`;
}
function materialAlert() {
  return `<div class="warn" style="max-width:820px;margin:0 auto 10px" role="status">${icon('warning')}<span><b>Foxy necesita algo para leer.</b> Esta carpeta no tiene material legible todavía. Podés charlar, pero para practicar o preparar un examen sumá un apunte o el programa.</span><button type="button" class="btn secondary sm" data-dialog="materials" style="margin-left:auto">${icon('plus')}Agregar material</button></div>`;
}
function toolForm() {
  const s = state, teacher = s.role === 'teacher';
  const t = (teacher ? TEACHER_TOOLS : STUDENT_TOOLS)[s.tool];
  const o = s.toolOpts;
  const seg = (name, values, cur) => `<div class="mini-seg" role="group" aria-label="${name}">${values.map(v => `<button type="button" data-opt="${name}" data-val="${v}" aria-pressed="${String(v) === String(cur)}">${v}</button>`).join('')}</div>`;
  let fields = '';
  if (['QUIZ', 'MOCK_EXAM', 'EXERCISE'].includes(s.tool)) fields = `<div class="fields">
    <div class="field"><span class="lbl">Cantidad de preguntas</span>${seg('Cantidad', [5, 10, 15], o.count)}</div>
    <div class="field"><span class="lbl">Dificultad</span>${seg('Dificultad', ['Inicial', 'Intermedia', 'Desafiante'], o.level)}</div>
    ${teacher ? `<div class="field full"><span class="lbl">Formato de preguntas</span>${seg('Formato', ['Opción múltiple', 'Verdadero o falso', 'Mixto'], o.format)}</div>` : ''}</div>`;
  if (s.tool === 'PLAN' && teacher) fields = `<div class="fields"><div class="field"><span class="lbl">Duración de la clase</span>${seg('Duración', ['40 min', '80 min', '120 min'], o.duration ?? '80 min')}</div></div>`;
  const blocked = !teacher && s.noMaterial && ['QUIZ', 'MOCK_EXAM', 'EXERCISE'].includes(s.tool);
  return `<div class="tool-form" role="group" aria-labelledby="tf-h">
    <header><span class="ic">${icon(t.icon)}</span><span><strong id="tf-h">${t.label}</strong><small>${teacher ? `Con ${esc(ctxLabel().strong)}` : `Sobre ${s.topics.length ? s.topics.map(topicName).join(', ') : 'todos los temas'}`}</small></span><button type="button" class="icon-btn" data-close-tool aria-label="Cerrar ${t.label}">${icon('close')}</button></header>
    ${fields}
    ${blocked ? `<p class="note" style="margin-top:10px">${icon('warning')} Sumá un material para poder preparar la práctica.</p>` : `<p class="note" style="margin-top:10px">Escribí abajo qué querés que tenga en cuenta, o mandalo así.</p>`}
  </div>`;
}
function composerView() {
  const s = state, teacher = s.role === 'teacher';
  const t = s.tool ? (teacher ? TEACHER_TOOLS : STUDENT_TOOLS)[s.tool] : null;
  const blocked = !teacher && s.noMaterial && ['QUIZ', 'MOCK_EXAM', 'EXERCISE'].includes(s.tool);
  const chips = teacher ? '' : `<div class="ctx"><span>Temas:</span>${s.topics.length ? s.topics.map(id => `<span class="chip">${esc(topicName(id))}<button type="button" data-drop-topic="${id}" aria-label="Quitar ${esc(topicName(id))}">${icon('close')}</button></span>`).join('') : '<span class="chip muted">Todos los temas</span>'}<button type="button" class="link mobile-only" data-rail>Cambiar</button></div>`;
  const ph = t ? (teacher ? '¿Sobre qué tema y para quiénes? Por ejemplo: fases de la mitosis para 2.º año' : 'Opcional: contale a Foxy en qué querés hacer foco') : teacher ? 'Contame tu idea o preguntame algo…' : '¿Qué te gustaría entender mejor?';
  return `<form class="composer" data-composer>
    ${chips}
    <label class="sr" for="cmp">Mensaje para Foxy</label>
    <textarea id="cmp" rows="2" placeholder="${esc(ph)}">${esc(s.draft)}</textarea>
    <div class="row">
      <button type="button" class="head-btn" data-dialog="${teacher ? 'library' : 'materials'}">${icon(teacher ? 'book' : 'folder')}<span class="lbl">${teacher ? 'Biblioteca' : 'Materiales'}</span><span class="count">${teacher ? 4 : s.noMaterial ? 0 : 3}</span></button>
      <button type="button" class="icon-btn" aria-label="Adjuntar archivo">${icon('attach')}</button>
      <span class="hint">Enter para enviar · Shift + Enter para otra línea</span>
      <button type="submit" class="btn primary send" ${blocked || s.waiting ? 'disabled' : ''}>${t ? t.cta : 'Enviar'}${icon('arrow-right')}</button>
    </div></form>`;
}

/* ---------- Mensajes ---------- */
function msgView(m) {
  if (m.me) return `<div class="msg me"><span class="avatar" style="background:#ffc94d;color:#1b3a52">${state.role === 'teacher' ? 'LD' : 'MD'}</span><div class="bubble">${m.tags ? `<div class="ctx-line">${m.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}<p>${esc(m.text)}</p></div></div>`;
  return `<div class="msg"><span class="avatar fox"><img src="${FOX}" alt=""></span><div class="bubble">${m.html}</div></div>`;
}
function seedConversation() {
  state.topics = ['t1'];
  state.messages = [
    { me: true, text: '¿Me explicás la exposición con un ejemplo de la vida real?', tags: ['Exposición'] },
    { html: `<p>Imaginá que llenás un vaso con una canilla. <b>La apertura</b> es cuánto abrís la canilla y <b>el tiempo</b> es cuánto la dejás abierta. La exposición es cuánta agua termina en el vaso.</p><ul><li>Abrís más → se llena más rápido.</li><li>La dejás más tiempo → también se llena más.</li></ul><p>Si te pasás, el vaso rebalsa: la foto queda «quemada».</p>
      <div class="sources"><button type="button">${icon('file')}Programa de Fotografía y luz · p. 2</button><button type="button">${icon('file')}Apunte · exposición.pdf</button></div>
      <div class="follow"><button type="button" class="tool-chip" data-tool="QUIZ">${icon('check')}Practicar Exposición</button><button type="button" class="tool-chip" data-tool="OUTLINE">${icon('progress')}Hacer un esquema</button></div>` },
  ];
}
function seedPracticeMessage() {
  state.topics = ['t1', 't2'];
  state.messages = [
    { me: true, text: 'Quiero practicar.', tags: ['Practicar · 5 preguntas', 'Exposición', 'Contraste'] },
    { html: `<p>Listo. Preparé 5 preguntas sobre Exposición y Contraste con tus materiales.</p><button type="button" class="creation-card" data-open-practice><span class="ic">${icon('check')}</span><span><small>Práctica · 5 preguntas · Intermedia</small><strong>Práctica · La luz</strong></span><span class="go">Abrir${icon('arrow-right')}</span></button>` },
  ];
}
function seedTeacherResult() {
  state.messages = [
    { me: true, text: 'Fases de la mitosis para 2.º año, con distractores sobre meiosis.', tags: ['Quiz · 5 preguntas', 'Intermedia', 'Biología 2.º B · Mitosis'] },
    { html: `<p>Te dejé una propuesta de 5 preguntas. Las opciones correctas están mezcladas y cada distractor apunta a una confusión frecuente con la meiosis.</p><button type="button" class="creation-card" data-open-creation><span class="ic">${icon('clipboard')}</span><span><small>Quiz · 5 preguntas · Opción múltiple</small><strong>Mitosis · 5 preguntas</strong></span><span class="go">Revisar${icon('arrow-right')}</span></button>` },
  ];
  state.panel = 'creation'; state.creation = 'quiz';
}
function seedTeacherPlan() {
  state.messages = [
    { me: true, text: 'Una clase de 80 minutos sobre las fases de la mitosis.', tags: ['Plan de clase · 80 min', 'Biología 2.º B · Mitosis'] },
    { html: `<p>Armé una secuencia con inicio, desarrollo y cierre. La barra muestra cómo se reparten los 80 minutos.</p><button type="button" class="creation-card" data-open-creation="plan"><span class="ic">${icon('calendar')}</span><span><small>Plan de clase · 80 min</small><strong>Fases de la mitosis</strong></span><span class="go">Revisar${icon('arrow-right')}</span></button>` },
  ];
  state.panel = 'creation'; state.creation = 'plan';
}
const STAGES = { student: ['Recibimos tu pedido', 'Leyendo tus materiales y los del aula', 'Armando las preguntas', 'Revisando que cada respuesta tenga su fuente'], teacher: ['Pedido recibido', 'Consultando el contexto del aula', 'Preparando la propuesta', 'Mezclando opciones y revisando distractores'] };
function waitView() {
  const w = state.waiting, stages = STAGES[state.role];
  return `<div class="wait" role="status" aria-label="Foxy está preparando tu pedido"><ol>${stages.map((st, i) => `<li class="${i < w.stage ? 'done' : i === w.stage ? 'now' : ''}"><span class="dot">${i < w.stage ? icon('check') : ''}</span>${st}</li>`).join('')}</ol>
    <footer><span>Podés seguir leyendo mientras tanto.</span><button type="button" class="btn secondary sm" data-stop>Detener</button></footer></div>`;
}
let waitTimer = null;
function startWait(tool, frozen = false) {
  const s = state, teacher = s.role === 'teacher';
  const t = (teacher ? TEACHER_TOOLS : STUDENT_TOOLS)[tool];
  const tags = tool === 'QUIZ' || tool === 'MOCK_EXAM' || tool === 'EXERCISE' ? [`${t.label} · ${s.toolOpts.count} preguntas`, s.toolOpts.level] : [t.label];
  s.messages = [...s.messages, { me: true, text: s.draft || (teacher ? 'Fases de la mitosis para 2.º año.' : 'Quiero practicar.'), tags: teacher ? [...tags, ctxLabel().strong] : [...tags, ...s.topics.map(topicName)] }];
  s.draft = ''; s.tool = null; s.waiting = { stage: frozen ? 2 : 0, tool };
  clearInterval(waitTimer);
  if (frozen) return;
  waitTimer = setInterval(() => {
    if (!s.waiting) return clearInterval(waitTimer);
    s.waiting.stage++;
    if (s.waiting.stage >= STAGES[s.role].length) { clearInterval(waitTimer); finishWait(); }
    else rerenderDesk();
  }, 900);
}
function finishWait() {
  const s = state, tool = s.waiting.tool; s.waiting = null;
  if (s.role === 'teacher') {
    const last = s.messages.pop(); seedTeacherResult(); s.messages[0] = last;
    if (tool === 'PLAN') { seedTeacherPlan(); s.messages[0] = last; }
  } else if (tool === 'QUIZ' || tool === 'MOCK_EXAM') {
    s.messages.push({ html: `<p>Listo. Preparé ${s.toolOpts.count} preguntas sobre ${s.topics.map(topicName).join(' y ') || 'tus temas'}.</p><button type="button" class="creation-card" data-open-practice><span class="ic">${icon('check')}</span><span><small>Práctica · ${s.toolOpts.count} preguntas · ${s.toolOpts.level}</small><strong>Práctica · La luz</strong></span><span class="go">Abrir${icon('arrow-right')}</span></button>` });
    openPractice();
  } else if (tool === 'PLAN') {
    s.messages.push({ html: '<p>Contame la fecha y tus horarios en el panel y te propongo las sesiones.</p>' }); s.panel = 'review'; s.review = { step: 1, date: '2026-12-04', topics: [...s.topics], days: [1, 3], minutes: 45 };
  } else {
    seedConversation(); s.messages = s.messages.slice(-2);
  }
  rerenderDesk(); focusPanel();
}

/* ---------- Panel lateral ---------- */
function panelView() {
  const p = state.panel;
  if (p === 'history') return historyPanel();
  if (p === 'creations') return creationsPanel();
  if (p === 'practice') return practicePanel();
  if (p === 'review') return reviewPanel();
  if (p === 'creation') return creationPanel();
  return '';
}
const enterCls = () => { const k = state.panel + (state.creation ?? ''); const e = k !== state.lastPanel; state.lastPanel = k; return e ? ' enter' : ''; };
const panelShell = (kicker, title, body, foot = '') => `<aside class="side-panel${enterCls()}" role="region" aria-labelledby="sp-h"><header><span><small>${kicker}</small><h2 id="sp-h" tabindex="-1">${title}</h2></span><button type="button" class="icon-btn" data-close-panel aria-label="Cerrar panel">${icon('close')}</button></header>${body}${foot ? `<footer>${foot}</footer>` : ''}</aside>`;
function historyPanel() {
  const teacher = state.role === 'teacher', list = teacher ? TEACHER_CONVERSATIONS : CONVERSATIONS;
  return panelShell('Historial', 'Tus conversaciones', `<div class="scroll"><label class="search" style="max-width:none;display:block;margin-bottom:12px"><span class="sr">Buscar conversación</span>${icon('search')}<input class="input" type="search" placeholder="Buscar conversación"></label>
    ${['Hoy', 'Ayer', 'Lunes'].map(day => `<p class="group-title">${day}</p>${list.filter(c => c.when === day).map((c, i) => `<div class="list-item ${day === 'Hoy' ? 'active' : ''}"><span class="ic">${icon('chat')}</span><span><strong>${esc(c.title)}</strong><small>${esc(teacher ? c.ctx : c.topics.map(topicName).join(', '))}</small></span><button type="button" class="icon-btn" aria-label="Renombrar ${esc(c.title)}">${icon('edit')}</button></div>`).join('')}`).join('')}</div>`);
}
function creationsPanel() {
  const teacher = state.role === 'teacher', list = teacher ? TEACHER_CREATIONS : STUDENT_CREATIONS;
  const tabs = teacher ? ['Todas', 'Actividades', 'Planificaciones', 'Apuntes', 'Rúbricas'] : ['Todas', 'Prácticas', 'Apuntes', 'Esquemas'];
  return `<aside class="side-panel${enterCls()}" role="region" aria-labelledby="sp-h"><header><span><small>Creaciones</small><h2 id="sp-h" tabindex="-1">${teacher ? 'Lo que preparaste con Foxy' : 'Lo que armaste en esta carpeta'}</h2></span><button type="button" class="icon-btn" data-close-panel aria-label="Cerrar panel">${icon('close')}</button></header>
    <div class="tabs-line" role="tablist" aria-label="Tipo de creación">${tabs.map(t => `<button type="button" role="tab" data-ctab="${t}" aria-selected="${state.creationsTab === t}">${t}</button>`).join('')}</div>
    <div class="scroll">${list.filter(c => state.creationsTab === 'Todas' || (teacher ? c.group : c.kind + 's').startsWith(state.creationsTab.slice(0, 5))).map(c => `<button type="button" class="list-item" ${teacher ? 'data-open-creation' : c.kind === 'Práctica' ? 'data-open-practice' : ''}><span class="ic">${icon(c.icon)}</span><span><strong>${esc(c.title)}</strong><small>${esc(c.kind)} · ${esc(c.meta)}</small></span>${icon('chevron-right')}</button>`).join('') || `<div class="empty"><img src="${PUB}/foxmind-3d/states/empty-160.webp" alt=""><p>Todavía no hay creaciones de este tipo.</p></div>`}</div></aside>`;
}
function creationPanel() {
  const plan = state.creation === 'plan';
  if (plan) return panelShell('Plan de clase · Biología 2.º B', 'Fases de la mitosis', `<div class="scroll doc"><div class="timebar" role="img" aria-label="Inicio 15 minutos, desarrollo 50 minutos, cierre 15 minutos"><span class="a" style="flex:15">15′</span><span class="b" style="flex:50">50′</span><span class="c" style="flex:15">15′</span></div><div class="timelegend"><span>Inicio</span><span>Desarrollo</span><span>Cierre</span></div>
    <h3>Inicio · 15 min</h3><p>Pregunta disparadora: ¿cómo hace una herida para cerrarse? Recuperá lo visto sobre la célula.</p>
    <h3>Desarrollo · 50 min</h3><ol><li>Explicación con esquema de las cuatro fases.</li><li>En parejas, ordenan tarjetas con imágenes de cada fase.</li><li>Puesta en común: qué pista usaron para reconocer cada fase.</li></ol>
    <h3>Cierre · 15 min</h3><p>Ticket de salida: una diferencia entre mitosis y meiosis.</p></div>`, creationFoot());
  return panelShell('Quiz · Biología 2.º B', 'Mitosis · 5 preguntas', `<div class="scroll doc" ${state.editing ? '' : ''}>
    <div class="ok-box" style="margin-bottom:12px">${icon('check')}<span>Las opciones se mezclaron. Revisá cada pregunta antes de llevarla al aula.</span></div>
    ${[['¿En qué fase se alinean los cromosomas en el centro de la célula?', ['Metafase', 'Profase', 'Telofase'], 0], ['¿Qué resultado tiene la mitosis?', ['Dos células con la mitad de cromosomas', 'Dos células idénticas a la original', 'Cuatro células distintas'], 1], ['¿Qué se forma durante la profase?', ['La placa celular', 'El huso mitótico', 'Los gametos'], 1]].map(([q, opts, r], i) => `<h3 ${state.editing ? 'contenteditable="true"' : ''}>${i + 1}. ${q}</h3><ul>${opts.map((o, j) => `<li ${state.editing ? 'contenteditable="true"' : ''}>${j === r ? `<b>${o}</b> · correcta` : o}</li>`).join('')}</ul>`).join('')}
    <p style="color:var(--muted);font-weight:700">Y 2 preguntas más…</p></div>`, creationFoot());
}
function creationFoot() {
  return `<button type="button" class="btn quiet sm" data-edit aria-pressed="${state.editing}">${icon(state.editing ? 'check' : 'edit')}${state.editing ? 'Listo' : 'Editar'}</button><button type="button" class="btn quiet sm" data-download>${icon('download')}Descargar</button><span class="spacer"></span><button type="button" class="btn primary sm" data-dialog="handoff">${icon('arrow-right')}Llevar al aula</button>`;
}
function openPractice() {
  state.panel = 'practice';
  state.practice ??= { index: 0, answers: {}, confirmed: [], done: false };
}
function practicePanel() {
  const p = state.practice, total = QUESTIONS.length;
  const status = i => { if (!p.confirmed.includes(i)) return ''; const a = (p.answers[i] ?? []).slice().sort().join(), r = QUESTIONS[i].right.join(); return a === r ? 'ok' : QUESTIONS[i].right.some(x => (p.answers[i] ?? []).includes(x)) ? 'part' : 'bad'; };
  const dots = `<div class="pq-progress" role="group" aria-label="Preguntas">${QUESTIONS.map((_, i) => `<button type="button" class="${status(i)} ${i === p.index && !p.done ? 'now' : ''}" data-q="${i}" aria-label="Pregunta ${i + 1}${p.confirmed.includes(i) ? ', confirmada' : ''}" ${i === p.index ? 'aria-current="step"' : ''}></button>`).join('')}</div>`;
  if (p.done) {
    const ok = QUESTIONS.filter((_, i) => status(i) === 'ok').length, part = QUESTIONS.filter((_, i) => status(i) === 'part').length;
    const score = Math.round((ok + part * .5) / total * 100);
    return panelShell('Práctica · resultado', 'Así te fue', `<div class="scroll">${dots}
      <div class="result-hero"><div class="ring" style="--p:${score}" role="img" aria-label="${ok} correctas de ${total}"><b>${ok}/${total}</b></div><strong style="font-size:20px;font-weight:900">${ok >= 4 ? '¡Muy bien!' : 'Vas bien, sigamos con lo que falló'}</strong><span style="color:var(--muted);font-weight:700">${ok} correctas · ${part} parcial · ${total - ok - part} para repasar</span></div>
      <p class="group-title">Cómo quedaron tus temas</p>
      <div class="topic-results">${[['Exposición', 3], ['Contraste', 2], ['Temperatura de color', 1], ['Velocidad de obturación', 1]].map(([t, l]) => `<div>${t}<span class="meter" role="img" aria-label="Dominio ${['', 'inicial', 'en progreso', 'logrado'][l]}">${[1, 2, 3].map(n => `<i class="${n <= l ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div>
      <p class="group-title">Repasá tus respuestas</p>${QUESTIONS.map((q, i) => `<button type="button" class="review-row" data-q="${i}" data-review-q><span class="n">${i + 1}</span>${esc(q.prompt.slice(0, 52))}…<span class="chip ${status(i) === 'ok' ? 'pine' : status(i) === 'part' ? 'sun' : 'orange'}">${status(i) === 'ok' ? 'Correcta' : status(i) === 'part' ? 'Parcial' : 'Para repasar'}</span></button>`).join('')}
    </div>`, `<button type="button" class="btn secondary sm" data-open-review>${icon('calendar')}Organizar mi repaso</button><button type="button" class="btn primary sm" data-retry>${icon('refresh')}Practicar lo que falló</button>`);
  }
  const i = p.index, q = QUESTIONS[i], chosen = p.answers[i] ?? [], conf = p.confirmed.includes(i), multi = q.type === 'MULTIPLE';
  const st = status(i);
  return panelShell(`Práctica · ${i + 1} de ${total}`, 'Práctica · La luz', `<div class="scroll pq">${dots}
    <div class="pq-meta"><span>${esc(topicName(q.topic))}</span><span>${multi ? 'Elegí dos' : 'Elegí una'}</span></div>
    <h3 id="pq-h">${esc(q.prompt)}</h3>
    <div role="group" aria-labelledby="pq-h">${q.options.map((o, j) => `<button type="button" class="opt ${multi ? 'square' : ''} ${conf ? (q.right.includes(j) ? 'right' : chosen.includes(j) ? 'wrong' : '') : ''}" data-opt-i="${j}" aria-pressed="${chosen.includes(j)}" ${conf ? 'disabled' : ''}><span class="mark">${conf && q.right.includes(j) ? icon('check') : 'ABC'[j]}</span>${esc(o)}</button>`).join('')}</div>
    ${conf ? `<div class="feedback ${st}" role="status"><strong>${icon(st === 'ok' ? 'check' : 'warning')}${st === 'ok' ? 'Correcta' : st === 'part' ? 'Parcialmente correcta' : 'Revisemos la respuesta'}</strong><p>${esc(q.why)}</p><span class="sources"><button type="button">${icon('file')}Programa de Fotografía y luz · p. 2</button></span></div>` : ''}
  </div>`, `${i > 0 ? `<button type="button" class="btn quiet sm" data-q="${i - 1}">${icon('arrow-left')}Anterior</button>` : ''}<span class="spacer"></span>
    ${!conf ? `<button type="button" class="btn primary sm" data-confirm ${chosen.length ? '' : 'disabled'}>Confirmar respuesta</button>`
      : i < total - 1 ? `<button type="button" class="btn primary sm" data-q="${i + 1}">Siguiente${icon('arrow-right')}</button>`
      : `<button type="button" class="btn primary sm" data-dialog="finish">${icon('check')}Finalizar práctica</button>`}`);
}
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
function reviewPanel() {
  const r = state.review, steps = ['Fecha', 'Temas', 'Horarios', 'Propuesta'];
  const head = `<div class="plan-steps">${steps.map((s, i) => `<span class="${i + 1 === r.step ? 'on' : i + 1 < r.step ? 'done' : ''}">${i + 1 < r.step ? icon('check') : ''}${i + 1}. ${s}</span>`).join('')}</div>`;
  let body = '', foot = '';
  if (r.step === 1) { body = `<div class="field"><label for="rv-t">¿Para qué te preparás?</label><input id="rv-t" class="input" value="Parcial de la unidad 1"></div><div class="field" style="margin-top:12px"><label for="rv-d">¿Cuándo es?</label><input id="rv-d" class="input" type="date" value="${r.date}"><small>Faltan 9 días.</small></div>`; }
  if (r.step === 2) { body = `<p class="hint" style="color:var(--muted);font-weight:600;margin-bottom:8px">Marcamos primero los temas que menos practicaste.</p><div class="check-list">${TOPICS.map(t => `<label><input type="checkbox" ${r.topics.includes(t.id) ? 'checked' : ''}>${esc(t.title)}${t.level ? '' : '<span class="chip orange">Sin practicar</span>'}</label>`).join('')}</div>`; }
  if (r.step === 3) { body = `<div class="field"><span class="lbl">¿Qué días podés?</span><div class="avail" role="group" aria-label="Días disponibles">${DAYS.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="${r.days.includes(i)}">${d}<small>18:00</small></button>`).join('')}</div></div>
      <div class="field" style="margin-top:14px"><span class="lbl">¿Cuánto tiempo por sesión?</span><div class="mini-seg" role="group" aria-label="Minutos por sesión">${[30, 45, 60].map(m => `<button type="button" data-min="${m}" aria-pressed="${r.minutes === m}">${m} min</button>`).join('')}</div></div>`; }
  if (r.step === 4) {
    body = `<p class="hint" style="color:var(--muted);font-weight:600;margin-bottom:10px">${r.minutes} minutos por sesión hasta el ${'jueves 4 de diciembre'}. Podés mover o quitar cualquiera.</p>
      ${[['Mar', 25, 'Contraste', 'Repaso con ejemplos'], ['Jue', 27, 'Temperatura de color', 'Explicación y práctica corta'], ['Sáb', 29, 'Velocidad de obturación', 'Práctica de 5 preguntas', true], ['Mar', 2, 'Repaso general', 'Simulacro de 10 preguntas']].map(([d, n, t, a, c]) => `<div class="session ${c ? 'conflict' : ''}"><span class="day"><small>${d}</small><b>${n}</b></span><span><strong>${t}</strong><small>18:00 · ${r.minutes} min · ${a}</small>${c ? '<br><small style="color:#7a5600">Se superpone con «Cumpleaños de Sofi».</small>' : ''}</span><button type="button" class="icon-btn" aria-label="Editar sesión de ${t}">${icon('edit')}</button></div>`).join('')}
      <div class="session exam"><span class="day"><small>Jue</small><b>4</b></span><span><strong>Parcial de la unidad 1</strong><small>Día del examen</small></span></div>
      <div class="warn">${icon('warning')}<span>Una sesión se superpone con tu agenda. Movela o agregala igual.</span></div>`;
  }
  foot = `${r.step > 1 ? `<button type="button" class="btn quiet sm" data-rstep="${r.step - 1}">${icon('arrow-left')}Atrás</button>` : ''}<span class="spacer"></span>${r.step < 3 ? `<button type="button" class="btn primary sm" data-rstep="${r.step + 1}">Continuar${icon('arrow-right')}</button>` : r.step === 3 ? `<button type="button" class="btn primary sm" data-rstep="4">${icon('spark')}Proponer sesiones</button>` : `<button type="button" class="btn primary sm" data-dialog="agenda">${icon('calendar')}Agregar 4 sesiones a Agenda</button>`}`;
  return panelShell('Organizar mi repaso', r.step === 4 ? 'Tu propuesta de repaso' : 'Armemos tu repaso', `<div class="scroll">${head}${body}</div>`, foot);
}

/* ---------- Diálogos ---------- */
function dialogShell(title, sub, content, foot, wide = false) {
  return `<div class="scrim" data-scrim><div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dl-h"><header><span><h2 id="dl-h" tabindex="-1">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</span><button type="button" class="icon-btn" data-close-dialog aria-label="Cerrar">${icon('close')}</button></header><div class="content">${content}</div><footer>${foot}</footer></div></div>`;
}
function renderOverlay() {
  const d = state.dialog, o = $('[data-overlay]');
  if (!d) { o.innerHTML = ''; state.lastDialog = null; return; }
  const still = state.lastDialog === d.kind; state.lastDialog = d.kind;
  let html = '';
  if (d.kind === 'filters') html = dialogShell('Filtrar carpetas', '', `<div class="field"><label for="f-y">Año</label><select id="f-y" class="input"><option>Todos los años</option><option>2026</option><option>2025</option></select></div><div class="field"><label for="f-l">Vínculo con aula</label><select id="f-l" class="input"><option>Todos los vínculos</option><option>Sin aula vinculada</option><option>Fotografía y luz</option></select></div>`, `<button class="btn quiet" data-close-dialog>Limpiar</button><button class="btn primary" data-close-dialog>Ver carpetas</button>`);
  if (d.kind === 'materials') html = dialogShell('Materiales de la carpeta', 'Foxy lee los que tienen la marca «Foxy los lee».', `<div class="seg-tabs" role="group" aria-label="Procedencia"><button type="button" aria-pressed="true">Todos<span class="count">3</span></button><button type="button" aria-pressed="false">Del aula<span class="count">2</span></button><button type="button" aria-pressed="false">Propios<span class="count">1</span></button></div>
    ${MATERIALS.map(m => `<div class="list-item" style="cursor:default"><span class="ic">${icon('file')}</span><span><strong>${esc(m.title)}</strong><small>${m.origin === 'Aula' ? 'Del aula Fotografía y luz' : 'Tuyo'}</small></span><span class="chip ${m.ok ? 'pine' : 'muted'}">${m.ok ? 'Foxy los lee' : 'Sin lectura de IA'}</span><button type="button" class="icon-btn" aria-label="Descargar ${esc(m.title)}">${icon('download')}</button></div>`).join('')}
    <div class="drop">${icon('upload')}<strong>Sumá un apunte o tu programa</strong><small>PDF, Word o PowerPoint · hasta 20 MB</small><button type="button" class="btn secondary sm" data-add-material>Seleccionar archivo</button></div>`, `<button class="btn primary" data-close-dialog>Listo</button>`, true);
  if (d.kind === 'library') html = dialogShell('Tu biblioteca privada', 'Hasta 6 archivos y 20 MB en total. Foxy los usa como referencia.', `${['Programa Biología 2.º B.pdf', 'Guía de laboratorio.docx', 'Presentación célula.pptx', 'Notas sueltas.docx'].map((f, i) => `<div class="list-item" style="cursor:default"><span class="ic">${icon('file')}</span><span><strong>${f}</strong><small>${['1,2 MB', '340 KB', '4,8 MB', '90 KB'][i]}</small></span><span class="chip ${i === 2 ? 'muted' : 'pine'}">${i === 2 ? 'Sin lectura de IA' : 'En contexto'}</span></div>`).join('')}<div class="trail"><div class="bar" aria-hidden="true"><i class="on" style="flex:6.4"></i><i style="flex:13.6"></i></div><small>6,4 MB de 20 MB · 4 de 6 archivos</small></div>`, `<button class="btn secondary" data-close-dialog>${icon('upload')}Agregar archivo</button><button class="btn primary" data-close-dialog>Listo</button>`, true);
  if (d.kind === 'context') {
    const room = ROOMS.find(r => r.id === d.room);
    html = dialogShell('¿Con qué trabajamos?', 'Foxy usa este contexto en todo el chat. Si ya conversaste, cambiarlo abre otro chat.', `<div class="ctx-options" role="radiogroup" aria-label="Contexto">
      ${[['general', 'folder', 'Ideas generales', 'Sin aula. Tu biblioteca privada como referencia.'], ['room', 'users', 'Un aula completa', 'Plan, materiales y actividades del aula.'], ['topics', 'book', 'Temas de un aula', 'Sólo los temas y las fuentes que elijas.']].map(([k, ic, t, s]) => `<button type="button" class="ctx-option" role="radio" data-ctx-mode="${k}" aria-checked="${d.mode === k}" aria-pressed="${d.mode === k}"><span class="ic">${icon(ic)}</span><strong>${t}</strong><span>${s}</span></button>`).join('')}</div>
      ${d.mode !== 'general' ? `<div class="field"><label for="ctx-room">Aula</label><select id="ctx-room" class="input" data-ctx-room>${ROOMS.map(r => `<option value="${r.id}" ${r.id === d.room ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div>` : ''}
      ${d.mode === 'topics' ? `<fieldset style="border:0;margin:0;padding:0"><legend class="lbl" style="font-weight:800;margin-bottom:6px">Temas</legend><div class="check-list">${room.topics.map(t => `<label><input type="checkbox" data-ctx-topic="${t}" ${d.topics.includes(t) ? 'checked' : ''}>${t}</label>`).join('')}</div></fieldset>` : ''}`,
      `<button class="btn quiet" data-close-dialog>Cancelar</button><button class="btn primary" data-apply-ctx>${icon('check')}Usar este contexto</button>`, true);
  }
  if (d.kind === 'handoff') html = dialogShell('Llevar al aula', 'La propuesta se copia al aula. Ahí la terminás de revisar antes de publicarla.', `
      <div class="field"><label for="ho-r">Aula</label><select id="ho-r" class="input">${ROOMS.map(r => `<option ${r.id === 'r1' ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div>
      <div class="ctx-options" role="radiogroup" aria-label="Destino">${[['library', 'folder', 'Biblioteca del aula', 'Como material de lectura para tus estudiantes.'], ['activity', 'clipboard', 'Borrador de actividad', 'Un cuestionario que podés ajustar y publicar.']].map(([k, ic, t, s]) => `<button type="button" class="ctx-option" role="radio" data-dest="${k}" aria-checked="${d.dest === k}" aria-pressed="${d.dest === k}"><span class="ic">${icon(ic)}</span><strong>${t}</strong><span>${s}</span></button>`).join('')}</div>
      <div class="field"><span class="lbl">Tema del plan</span><div class="mini-seg" role="group" aria-label="Tema">${['Mitosis', 'Meiosis', 'Célula'].map((t, i) => `<button type="button" aria-pressed="${i === 0}">${t}</button>`).join('')}</div></div>`,
      `<button class="btn quiet" data-close-dialog>Cancelar</button><button class="btn primary" data-handoff>${icon('arrow-right')}${d.dest === 'library' ? 'Preparar para Biblioteca' : 'Crear borrador'}</button>`, true);
  if (d.kind === 'finish') html = dialogShell('¿Finalizar la práctica?', 'Después de finalizar no vas a poder cambiar tus respuestas.', `<div class="ok-box">${icon('check')}<span>Confirmaste las 5 preguntas.</span></div>`, `<button class="btn quiet" data-close-dialog>Seguir revisando</button><button class="btn primary" data-finish>Finalizar</button>`);
  if (d.kind === 'agenda') html = dialogShell('¿Agregar 4 sesiones a tu Agenda?', 'Cada sesión enlaza a esta carpeta y al examen. Te avisamos 15 minutos antes.', `<div class="warn">${icon('warning')}<span>La sesión del sábado 29 se superpone con «Cumpleaños de Sofi». Se agrega igual.</span></div>`, `<button class="btn quiet" data-close-dialog>Volver a la propuesta</button><button class="btn primary" data-agenda-ok>${icon('calendar')}Agregar a Agenda</button>`);
  if (d.kind === 'rename') html = dialogShell('Renombrar conversación', 'El nombre cambia en el historial; los mensajes quedan igual.', `<div class="field"><label for="rn">Nombre</label><input id="rn" class="input" value="Exposición con ejemplos"></div>`, `<button class="btn quiet" data-close-dialog>Cancelar</button><button class="btn primary" data-close-dialog>Guardar</button>`);
  o.innerHTML = html;
  if (still) o.querySelector('.scrim')?.classList.add('still');
  else $('#dl-h')?.focus();
}

/* ---------- Eventos ---------- */
function rerenderDesk() { const draft = $('#cmp')?.value; if (draft !== undefined) state.draft = draft; $('[data-view]').innerHTML = deskView(); renderOverlay(); bindDesk(); const m = $('[data-msgs]'); if (m) m.scrollTop = m.scrollHeight; }
function focusPanel() { requestAnimationFrame(() => $('#sp-h')?.focus()); }
function bindDesk() {
  const f = $('[data-composer]');
  if (f) f.onsubmit = e => {
    e.preventDefault(); const s = state; s.draft = $('#cmp').value.trim(); $('#cmp').value = '';
    if (s.tool) { startWait(s.tool); rerenderDesk(); return; }
    if (!s.draft) return;
    s.messages.push({ me: true, text: s.draft, tags: s.role === 'teacher' ? undefined : s.topics.map(topicName) }); s.draft = '';
    s.waiting = { stage: 0, tool: 'CHAT' }; rerenderDesk();
    setTimeout(() => { s.waiting = null; s.messages.push({ html: '<p>Buena pregunta. Pensalo así: cuanto más tiempo dejás abierto el obturador, más luz se acumula. Por eso de noche usás tiempos largos.</p><div class="sources"><button type="button">' + icon('file') + 'Apunte · exposición.pdf</button></div>' }); rerenderDesk(); }, 1600);
  };
  const t = $('#cmp');
  if (t) t.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } };
}
document.addEventListener('click', e => {
  const s = state, el = sel => e.target.closest(sel);
  let x;
  if ((x = el('[data-role]'))) { go(x.dataset.role === 'teacher' ? 'foxy' : 'estudio'); return; }
  if (el('[data-tools-menu]')) { s.toolsMenu = !s.toolsMenu; rerenderDesk(); (s.toolsMenu ? $('.tm-item') : $('[data-tools-menu]'))?.focus(); return; }
  if (s.toolsMenu && !el('.tools-menu')) { s.toolsMenu = false; rerenderDesk(); }
  if ((x = el('[data-rail-fold]'))) {
    prefs.railCollapsed = !prefs.railCollapsed; const target = x.dataset.railFocus; rerenderDesk();
    (prefs.railCollapsed ? $('.rail-mini [data-rail-fold]') : target ? $('.rail .topic') : $('.rail [data-rail-fold]'))?.focus();
    return;
  }
  if (el('[data-notes]')) { const p = $('[data-notes-panel]'), b = $('[data-notes]'); p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); return; }
  if ((x = el('[data-menu]'))) { const side = $('.side'); side.classList.toggle('open'); x.setAttribute('aria-expanded', String(side.classList.contains('open'))); return; }
  if ((x = el('[data-tab]'))) { s.tab = x.dataset.tab; render(); return; }
  if ((x = el('[data-topic]'))) { const id = x.dataset.topic; s.topics = s.topics.includes(id) ? s.topics.filter(t => t !== id) : [...s.topics, id]; rerenderDesk(); $(`[data-topic="${id}"]`)?.focus(); return; }
  if (el('[data-all]')) { s.topics = s.topics.length === TOPICS.length ? [] : TOPICS.map(t => t.id); rerenderDesk(); $('[data-all]')?.focus(); return; }
  if ((x = el('[data-drop-topic]'))) { s.topics = s.topics.filter(t => t !== x.dataset.dropTopic); rerenderDesk(); $('#cmp')?.focus(); return; }
  if ((x = el('[data-tool]'))) {
    s.tool = x.dataset.tool; s.toolsMenu = false;
    if (x.closest('.tools-menu')) x = $('[data-tools-menu]');
    if (s.role === 'student' && s.tool === 'PLAN') { s.tool = null; returnFocus = x; s.panel = 'review'; s.review = { step: 1, date: '2026-12-04', topics: [...s.topics], days: [1, 3], minutes: 45 }; rerenderDesk(); focusPanel(); return; }
    rerenderDesk(); $('#cmp')?.focus(); return;
  }
  if (el('[data-close-tool]')) { s.tool = null; rerenderDesk(); $('#cmp')?.focus(); return; }
  if ((x = el('[data-opt]'))) { const k = { Cantidad: 'count', Dificultad: 'level', Formato: 'format', 'Duración': 'duration' }[x.dataset.opt]; s.toolOpts[k] = k === 'count' ? +x.dataset.val : x.dataset.val; rerenderDesk(); $(`[data-opt="${x.dataset.opt}"][data-val="${x.dataset.val}"]`)?.focus(); return; }
  if (el('[data-stop]')) { clearInterval(waitTimer); s.waiting = null; s.messages.push({ html: '<p>Detuviste el pedido. Tu indicación se conserva y podés retomarlo cuando quieras.</p>' }); rerenderDesk(); $('#cmp')?.focus(); return; }
  if ((x = el('[data-panel]'))) { returnFocus = x; s.panel = s.panel === x.dataset.panel ? null : x.dataset.panel; rerenderDesk(); if (s.panel) focusPanel(); return; }
  if (el('[data-close-panel]')) { s.panel = null; s.editing = false; rerenderDesk(); (returnFocus && document.contains(returnFocus) ? returnFocus : $('#cmp'))?.focus(); return; }
  if ((x = el('[data-ctab]'))) { s.creationsTab = x.dataset.ctab; rerenderDesk(); $(`[data-ctab="${x.dataset.ctab}"]`)?.focus(); return; }
  if ((x = el('[data-open-practice]'))) { returnFocus = x; openPractice(); rerenderDesk(); focusPanel(); return; }
  if ((x = el('[data-open-creation]'))) { returnFocus = x; if (!s.messages.length) { x.dataset.openCreation === 'plan' ? seedTeacherPlan() : seedTeacherResult(); } s.panel = 'creation'; s.creation = x.dataset.openCreation === 'plan' ? 'plan' : s.creation ?? 'quiz'; rerenderDesk(); focusPanel(); return; }
  if ((x = el('[data-opt-i]'))) { const p = s.practice, q = QUESTIONS[p.index], j = +x.dataset.optI, cur = p.answers[p.index] ?? []; p.answers[p.index] = q.type === 'MULTIPLE' ? (cur.includes(j) ? cur.filter(v => v !== j) : [...cur, j]) : [j]; rerenderDesk(); $(`[data-opt-i="${j}"]`)?.focus(); return; }
  if (el('[data-confirm]')) { s.practice.confirmed.push(s.practice.index); rerenderDesk(); $('.feedback')?.setAttribute('tabindex', '-1'); $('.side-panel footer .btn.primary')?.focus(); return; }
  if ((x = el('[data-q]'))) { s.practice.index = +x.dataset.q; if (x.hasAttribute('data-review-q')) s.practice.done = false; rerenderDesk(); $('#pq-h')?.focus(); return; }
  if (el('[data-finish]')) { s.dialog = null; s.practice.done = true; rerenderDesk(); focusPanel(); toast('Guardamos tu práctica. Actualizamos el dominio de tus temas.'); return; }
  if (el('[data-retry]')) { s.practice = null; s.panel = null; s.topics = ['t2', 't3', 't5']; s.tool = 'QUIZ'; rerenderDesk(); $('#cmp')?.focus(); return; }
  if ((x = el('[data-open-review]'))) { returnFocus = x; s.railOpen = false; s.panel = 'review'; s.review = { step: 1, date: '2026-12-04', topics: ['t2', 't3', 't5'], days: [1, 3], minutes: 45 }; rerenderDesk(); focusPanel(); return; }
  if ((x = el('[data-rstep]'))) { s.review.step = +x.dataset.rstep; rerenderDesk(); focusPanel(); return; }
  if ((x = el('[data-day]'))) { const d = +x.dataset.day; s.review.days = s.review.days.includes(d) ? s.review.days.filter(v => v !== d) : [...s.review.days, d]; rerenderDesk(); $(`[data-day="${d}"]`)?.focus(); return; }
  if ((x = el('[data-min]'))) { s.review.minutes = +x.dataset.min; rerenderDesk(); $(`[data-min="${x.dataset.min}"]`)?.focus(); return; }
  if (el('[data-agenda-ok]')) { s.dialog = null; s.panel = null; rerenderDesk(); toast('Agregaste 4 sesiones a tu Agenda.'); $('[data-open-review]')?.focus(); return; }
  if (el('[data-edit]')) { s.editing = !s.editing; rerenderDesk(); $('[data-edit]')?.focus(); return; }
  if (el('[data-download]')) { toast('Descargamos «Mitosis · 5 preguntas.docx».'); return; }
  if ((x = el('[data-dest]'))) { s.dialog.dest = x.dataset.dest; renderOverlay(); $(`[data-dest="${x.dataset.dest}"]`)?.focus(); return; }
  if (el('[data-handoff]')) { const lib = s.dialog.dest === 'library'; s.dialog = null; renderOverlay(); toast(lib ? 'Abrimos la Biblioteca de Biología 2.º B con la propuesta lista para revisar.' : 'Creamos el borrador en Actividades de Biología 2.º B.'); return; }
  if ((x = el('[data-ctx-mode]'))) { s.dialog.mode = x.dataset.ctxMode; renderOverlay(); $(`[data-ctx-mode="${x.dataset.ctxMode}"]`)?.focus(); return; }
  if (el('[data-apply-ctx]')) { const d = s.dialog; s.ctx = { mode: d.mode, room: d.room, topics: d.mode === 'topics' ? d.topics : [] }; s.dialog = null; rerenderDesk(); $('.ctx-btn')?.focus(); toast(`Ahora Foxy trabaja con ${ctxLabel().strong}.`); return; }
  if (el('[data-add-material]')) { s.noMaterial = false; s.dialog = null; render(); toast('Sumamos «Apunte · exposición.pdf». Foxy ya lo puede leer.'); return; }
  if (el('[data-rename]')) { returnFocus = el('[data-rename]'); s.dialog = { kind: 'rename' }; renderOverlay(); return; }
  if ((x = el('[data-dialog]'))) { returnFocus = x; s.dialog = { kind: x.dataset.dialog, mode: s.ctx.mode, room: s.ctx.room, topics: [...(s.ctx.topics ?? [])], dest: 'library' }; renderOverlay(); return; }
  if (el('[data-close-dialog]') || (e.target.matches('[data-scrim]'))) { closeDialog(); return; }
  if (el('[data-rail]')) { s.railOpen = !s.railOpen; rerenderDesk(); if (s.railOpen) $('.rail .topic')?.focus(); return; }
  if (el('[data-close-rail]')) { s.railOpen = false; rerenderDesk(); $('[data-rail]')?.focus(); return; }
  if (el('[data-new]')) { Object.assign(s, { messages: [], waiting: null, tool: null, panel: null, practice: null }); rerenderDesk(); $('#cmp')?.focus(); toast('Empezaste un chat nuevo. El anterior quedó en el historial.'); return; }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-ctx-room]')) { state.dialog.room = e.target.value; state.dialog.topics = []; renderOverlay(); }
  if (e.target.matches('[data-ctx-topic]')) { const t = e.target.dataset.ctxTopic, d = state.dialog; d.topics = e.target.checked ? [...d.topics, t] : d.topics.filter(v => v !== t); }
});
function closeDialog() { state.dialog = null; renderOverlay(); (returnFocus && document.contains(returnFocus) ? returnFocus : $('#cmp'))?.focus(); }
document.addEventListener('keydown', e => {
  // Menú de herramientas: flechas, Inicio/Fin y Tab para salir, como un menú nativo.
  if (state.toolsMenu && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(e.key)) {
    const items = [...document.querySelectorAll('.tm-item')]; const i = items.indexOf(document.activeElement);
    if (e.key === 'Tab') { state.toolsMenu = false; rerenderDesk(); $('[data-tools-menu]')?.focus(); return; }
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[n]?.focus(); return;
  }
  if (e.key !== 'Escape') return;
  if (state.toolsMenu) { state.toolsMenu = false; rerenderDesk(); $('[data-tools-menu]')?.focus(); }
  else if (state.dialog) closeDialog();
  else if (state.railOpen) { state.railOpen = false; rerenderDesk(); $('[data-rail]')?.focus(); }
  else if (state.panel) { state.panel = null; rerenderDesk(); (returnFocus && document.contains(returnFocus) ? returnFocus : $('#cmp'))?.focus(); }
  else if (location.hash.startsWith('#/estudio/nueva')) go('estudio');
});
$('[data-jump]').addEventListener('change', e => go(e.target.value));
let toastTimer;
function toast(text) { const t = $('[data-toast]'); t.innerHTML = `<div class="toast" role="status">${icon('check')}${esc(text)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.innerHTML = ''), 3800); }
window.addEventListener('hashchange', () => { $('[data-overlay]').innerHTML = ''; render(); });
render();
