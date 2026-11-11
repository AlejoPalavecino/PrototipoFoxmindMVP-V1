const types = [['TP', 'Trabajo práctico'], ['Cuestionario', 'Cuestionario'], ['Evaluación', 'Evaluación']];
const actQuestionTypes = [['Abierta', 'Desarrollo'], ['Única', 'Selección única'], ['Múltiple', 'Selección múltiple']];
const actLetters = ['A', 'B', 'C'];
const actLearner = 'marina';
const actPublished = 'Asignada';
const actEmpty = () => ({ answers: {}, text: '', files: [], receipts: [] });
const actType = type => types.find(([id]) => id === type)?.[1] || type;
const actQuestionType = type => actQuestionTypes.find(([id]) => id === type)?.[1] || type;
const actOptions = q => actLetters.slice(0, q.type === 'Múltiple' ? 3 : 2);
const actSub = (a, learner = actLearner) => a?.submissions?.[learner];
const actReceipt = submission => submission?.receipts?.at(-1);
const actReceiptGrade = (s, receipt = actReceipt(s)) => receipt && s.published &&
  (s.published.receiptAt ? s.published.receiptAt === receipt.receivedAt : s.receipts.length === 1);
const actCurrent = () => room()?.activities.find(a => a.id === activityView);
const actDate = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires'
});
const actDue = a => a.due && new Date(`${a.due.length === 10 ? a.due + 'T23:59' : a.due}-03:00`);
const actDueLabel = a => a.due ? actDate.format(actDue(a)) + ' h' : 'Sin fecha límite';
const actDueValue = a => a.due?.length === 10 ? a.due + 'T23:59' : a.due || '';
let actListFilter = { type: '', status: '' };
let actListContext = '';
let actSection = 'consigna';
let actStudentMode = '';
let actFiles = [];
let actSubmissionFilter = '';
let actSelectedStudent = '';

function initActivityExamples() {
  const r = data.rooms.find(item => item.id === 'foto');
  if (!r || r.activityExamplesAdded) return;
  const examples = [
    { id: actLearner, name: 'Marina Demo', email: 'marina@example.test' },
    { id: 'act-demo-leo', name: 'Leo Demo', email: 'leo@example.test' },
    { id: 'act-demo-ines', name: 'Inés Demo', email: 'ines@example.test' },
  ];
  for (const learner of examples) {
    if (!r.students.some(item => item.id === learner.id || item.email === learner.email)) r.students.push(learner);
  }
  const { u, t } = topics(r)[0] || {};
  const defaults = { status: actPublished, example: true, unit: u?.id, topic: t?.id, due: '', late: false, criteria: [], questions: [] };
  const startedAt = '2026-11-10T14:00:00.000Z';
  const receivedAt = '2026-11-10T14:10:00.000Z';
  const tpText = 'Fotografié la misma taza cerca de la ventana y bajo la lámpara. Con luz lateral, la sombra marca mejor el volumen.';
  const tpFiles = [{ name: 'registro-de-luz.pdf', size: 480_000 }];
  const answers = { 0: 'Si entra menos luz, la foto se oscurece.', 1: 'A', 2: ['A', 'C'] };
  const quiz = [
    { type: 'Abierta', text: '¿Qué cambia en la foto si entra menos luz?', points: 4 },
    { type: 'Única', text: '¿Cuál de estos ajustes puede dejar entrar más luz?', a: 'Usar una apertura mayor', b: 'Acortar el tiempo de exposición', answer: 'A', points: 3 },
    { type: 'Múltiple', text: '¿Qué elementos pueden cambiar cómo se ve la luz en una foto?', a: 'La dirección de la luz', b: 'El nombre del archivo', c: 'La distancia de la fuente', answer: 'AC', points: 3 },
  ];
  const rows = [
    {
      id: 'act-demo-tp', type: 'TP', title: 'La luz en dos fotografías',
      objective: 'Comparar cómo cambia la imagen al mover la fuente de luz.',
      body: 'Fotografiá el mismo objeto con dos direcciones de luz. Compará las sombras y explicá cuál de las fotos muestra mejor el volumen.\n\nCompartí tus observaciones y, si querés, adjuntá las fotos.',
      criteria: [{ name: 'Comparación de las fotografías', weight: 100, evidence: 'Describe una diferencia visible y la relaciona con la dirección de la luz.' }],
      submissions: {
        'act-demo-leo': { ...actEmpty(), text: tpText, files: tpFiles, startedAt, receipts: [{ text: tpText, files: tpFiles, receivedAt, late: false }] },
        'act-demo-ines': { ...actEmpty(), startedAt, text: 'Estoy probando luz lateral.' },
      },
    },
    {
      id: 'act-demo-quiz', type: 'Cuestionario', title: 'Cómo cambia la exposición',
      objective: 'Relacionar la cantidad de luz con el resultado de una fotografía.',
      body: 'Respondé las tres preguntas. En la última, marcá todas las opciones que correspondan.',
      questions: quiz,
      submissions: {
        [actLearner]: { ...actEmpty(), startedAt, answers, receipts: [{ answers, receivedAt, late: false }],
          published: { grade: '9', feedback: 'Relacionaste bien la exposición con la cantidad de luz. Probá explicitar también cómo cambia el brillo.', points: ['3', '3', '3'], publishedAt: receivedAt } },
        'act-demo-ines': { ...actEmpty(), startedAt, answers: { 0: 'La imagen queda más oscura.' } },
      },
    },
    {
      id: 'act-demo-exam', type: 'Evaluación', title: 'Leer la luz de una escena',
      objective: 'Justificar decisiones de iluminación con ejemplos de la clase.',
      body: 'Imaginá un retrato junto a una ventana. Respondé qué decisiones tomarías para iluminarlo y explicá por qué.',
      questions: [{ type: 'Abierta', text: '¿Dónde ubicarías a la persona para que la luz marque el volumen de la cara? Justificá tu decisión.', points: 5 }, ...quiz.slice(1)],
      submissions: {
        'act-demo-ines': { ...actEmpty(), startedAt, answers, receipts: [{ answers, receivedAt, late: false }],
          review: { grade: '8', feedback: 'Desarrollá la relación entre la luz lateral y la sombra.', points: ['3', '3', '3'] } },
      },
    },
  ];
  for (const row of rows) {
    if (!r.activities.some(a => a.id === row.id)) r.activities.push({ ...defaults, ...row });
  }
  r.activityExamplesAdded = true;
  save();
}

function studentActivityResult(a) {
  return actSub(a)?.published;
}

function studentActivitySummary(a) {
  const s = actSub(a), receipt = actReceipt(s), published = studentActivityResult(a);
  if (s?.reopened) return { label: 'Reentrega habilitada', detail: 'Podés preparar una nueva entrega.' };
  if (actReceiptGrade(s, receipt)) return { label: 'Calificada', detail: `Nota publicada · ${published.grade}/10` };
  if (receipt) return { label: 'Entregada', detail: `${receipt.late ? 'Tarde' : 'A tiempo'} · ${actDate.format(new Date(receipt.receivedAt))} h` };
  if (actClosed(a)) return { label: 'Plazo cerrado', detail: actDueLabel(a) };
  if (s?.startedAt) return { label: 'En curso', detail: 'Tenés un borrador privado.' };
  return { label: 'Pendiente', detail: actDueLabel(a) };
}

function actStatusTone(label) {
  return ['Calificada','Entregada'].includes(label)?'mint':['En curso','Corrección privada'].includes(label)?'violet':'warm';
}
function actStudentAction(a) {
  const status=studentActivitySummary(a).label;
  return status==='Calificada'?'Ver devolución':status==='Entregada'?'Ver mi entrega':status==='En curso'?'Continuar borrador':status==='Reentrega habilitada'?'Preparar reentrega':'Ver consigna';
}

function activities() {
  if (activity && canWrite()) return activityEditor();
  const a = actCurrent();
  if (a && (!isStudent() || a.status === actPublished)) return activityDetail();
  const student = isStudent();
  const contextId = `${room().id}:${student}`;
  if (actListContext !== contextId) {
    actListContext = contextId;
    actListFilter = { type: '', status: '' };
  }
  const statuses = student
    ? ['Pendiente', 'En curso', 'Entregada', 'Calificada', 'Reentrega habilitada', 'Plazo cerrado']
    : ['Borrador', actPublished];
  const visible = room().activities.filter(item => !student || item.status === actPublished);
  const rows = visible.filter(item =>
    (!actListFilter.type || item.type === actListFilter.type) &&
    (!actListFilter.status || (student ? studentActivitySummary(item).label : item.status) === actListFilter.status)
  );
  return `<div class="act-workspace">${head('Actividades', student ? 'Consultá tus consignas, entregas y devoluciones.' : 'Prepará consignas y acompañá las entregas del aula.',
    canWrite() ? button(icon('plus') + 'Crear actividad', 'activity-new', 'primary') : '')}
    <div class="act-filters" aria-label="Filtros de actividades">
      ${fieldSelect('act-list-type', 'Tipo', [['', 'Todos los tipos'], ...types], actListFilter.type)}
      ${fieldSelect('act-list-status', 'Estado', [['', 'Todos los estados'], ...statuses.map(s => [s, s])], actListFilter.status)}
    </div>
    <div class="act-list">${rows.map(item => {
      const status = student ? studentActivitySummary(item) : { label: item.status, detail: actDueLabel(item) };
      const draft = item.status === 'Borrador';
      const received=room().students.filter(person=>actReceipt(actSub(item,person.id))).length;
      const toReview=room().students.filter(person=>['Entregada','Corrección privada'].includes(actTeacherStatus(actSub(item,person.id)))).length;
      return `<article class="panel act-list-item"><div>
        <div class="row">${tag(esc(actType(item.type)), 'violet')}${tag(esc(status.label), student?actStatusTone(status.label):draft ? 'warm' : 'mint')}${item.example ? '<small>Ejemplo</small>' : ''}</div>
        <h3>${esc(item.title || 'Actividad sin título')}</h3><p>${esc(status.detail)}</p>
        ${!student&&!draft?`<p class="act-delivery-count">${received} de ${room().students.length} entregas${toReview?` · ${toReview} por revisar`:''}</p>`:''}</div>
        <div class="row">${student?button(actStudentAction(item),'act-student-open',actStudentEditable(item)?'primary':'',item.id):canWrite() && draft ? button('Continuar edición', 'activity-edit', '', item.id) : button('Ver actividad', 'activity-read', '', item.id)}
        ${!student&&!draft?button('Ver entregas','act-activity-submissions','',item.id):''}</div>
      </article>`;
    }).join('') || empty(visible.length ? 'No hay actividades con estos filtros.' : 'Todavía no hay actividades para mostrar.')}</div></div>`;
}

function startActivity(id = '', topic = '') {
  if (!canWrite()) return;
  const saved = room().activities.find(a => a.id === id);
  if (id && saved?.status !== 'Borrador') return;
  activity = saved ? structuredClone(saved) : {
    id: uid(), method: 'manual', type: 'TP', unit: topics().find(({ t }) => t.id === topic)?.u.id || '', topic,
    objective: '', title: '', body: '', due: '', criteria: [], questions: [], source: '', difficulty: 'Intermedio',
    duration: '30', count: '3', late: false, status: 'Borrador', materialIds: [], teacherComment: '',
  };
  activity.materialIds ||= [];
  tab = 'Actividades';
  activityStep = 1;
  activityView = null;
  studentPreview = false;
  actFocusHeading();
}

function actFocusHeading() {
  render();
  main.querySelector('#activity-heading')?.focus();
}

function activityEditor() {
  const a = activity;
  const labels = ['Preparar', 'Consignas', 'Revisar y asignar'];
  const stage = [() => actContext(a), () => actConsigna(a), () => actReview(a)][activityStep - 1]();
  const cta = [
    a.method === 'ai' && !a.generated ? 'Generar propuesta' : 'Continuar a consignas',
    'Revisar actividad', 'Asignar al aula',
  ][activityStep - 1];
  return `<div class="act-workspace act-editor">${head('<span tabindex="-1" id="activity-heading">Crear actividad</span>',
    'El borrador queda en tu espacio hasta que lo asignás.', tag('Borrador privado', 'warm'))}
    ${steps(labels, activityStep)}
    <form id="activity-form" class="act-flow" novalidate>
      <p id="activity-error" role="alert" tabindex="-1" hidden></p>${stage}
      <div class="act-footer"><div class="row">
        ${button(activityStep === 1 ? 'Volver' : 'Atrás', 'activity-back')}
        ${button('Guardar borrador', 'activity-save', 'link')}</div>
        <button class="primary" type="submit">${cta}</button></div>
    </form></div>`;
}

function actContext(a) {
  const configured = a.method === 'ai' && !a.generated;
  return `<section class="panel act-section"><h3>Contexto y objetivo</h3>
    ${methodChoices(a.method, 'Escribir mi actividad')}
    <div class="act-grid">${fieldSelect('type', 'Tipo de actividad', types, a.type)}
    ${fieldSelect('unit', 'Unidad', [['', 'Sin unidad'], ...room().units.map(u => [u.id, u.title])], a.unit)}
    ${fieldSelect('topic', 'Tema', [['', 'Sin tema'], ...topics().filter(({ u }) => !a.unit || u.id === a.unit).map(({ t }) => [t.id, t.title])], a.topic)}</div>
    ${area('Objetivo de aprendizaje', 'objective', a.objective, 'required placeholder="¿Qué querés que aprendan o practiquen?"')}
    </section>${configured ? `<section class="panel act-section act-foxy"><div><h3>${icon('spark')}Propuesta de Foxy</h3>
    <p>Foxy arma un ejemplo editable para esta maqueta.</p></div>
    ${fieldSelect('source', 'Material de referencia', [['', 'Plan del aula'], ...room().materials.map(m => [m.id, m.title])], a.source)}
    <div class="act-grid">${fieldSelect('difficulty', 'Nivel', ['Inicial', 'Intermedio', 'Avanzado'].map(v => [v, v]), a.difficulty)}
    ${input('Duración estimada (minutos)', 'duration', a.duration, 'type="number" min="1" max="240" required')}
    ${a.type !== 'TP' ? input('Cantidad de preguntas', 'count', a.count, 'type="number" min="1" max="12" required') : ''}</div></section>` : ''}`;
}

function actConsigna(a) {
  return `<section class="panel act-section"><div><h3>Consigna para el aula</h3>
    <p>Indicá qué tienen que hacer y qué esperás que entreguen.</p></div>
    ${a.generated ? '<p class="notice">Propuesta de ejemplo lista para editar.</p>' : ''}
    ${input('Título', 'title', a.title, 'required maxlength="120"')}${area('Consigna', 'body', a.body, 'required', 5)}
    </section>
    ${a.type === 'TP' ? '' : `<section class="panel act-section"><h3>Preguntas</h3>
    ${a.questions.map(actQuestionEditor).join('') || '<p>Agregá preguntas de desarrollo o de selección.</p>'}
    ${a.questions.length < 12 ? `<div>${button('Agregar pregunta', 'question-add')}</div>` : ''}</section>`}
    <details class="panel act-optional" ${a.materialIds.length || a.teacherComment ? 'open' : ''}>
    <summary>Materiales y comentario docente</summary><div class="act-section">
    ${room().materials.map(m => `<label class="act-choice"><input type="checkbox" name="act-material" value="${esc(m.id)}" ${a.materialIds.includes(m.id) ? 'checked' : ''}>${esc(m.title)}</label>`).join('') || '<p>Esta aula todavía no tiene materiales.</p>'}
    ${area('Comentario para el estudiante (opcional)', 'teacherComment', a.teacherComment)}</div></details>
    <details class="panel act-optional" ${a.criteria.length ? 'open' : ''}><summary>Rúbrica de evaluación</summary><div class="act-section">
    <p>Los pesos de los criterios tienen que sumar 100%. <strong id="weight-total">${actWeight(a)}%</strong></p>
    ${a.criteria.map((c, i) => `<fieldset class="act-question"><legend>Criterio ${i + 1}</legend>
      <div class="act-grid">${input('Nombre del criterio', `criterion-${i}`, c.name, 'required')}
      ${input('Peso (%)', `weight-${i}`, c.weight, 'type="number" min="1" max="100" required')}</div>
      ${area('Evidencia esperada', `evidence-${i}`, c.evidence, 'required')}
      <div>${button('Quitar criterio', 'criterion-remove', 'link danger', i)}</div></fieldset>`).join('')}
    <div class="row">${button('Agregar criterio', 'criterion-add')}${a.criteria.length > 1 ? button('Repartir pesos', 'weights', 'link') : ''}</div></div></details>`;
}

function actQuestionEditor(q, i) {
  return `<fieldset class="act-question"><legend>Pregunta ${i + 1}</legend>
    <div class="act-grid">${fieldSelect(`qtype-${i}`, 'Tipo de pregunta', actQuestionTypes, q.type)}
    ${input('Puntos', `points-${i}`, q.points, 'type="number" min="1" max="100" required')}</div>
    ${area('Consigna de la pregunta', `question-${i}`, q.text, 'required')}
    ${q.type === 'Abierta' ? '' : `<div class="act-grid">${actOptions(q).map(letter => input(`Opción ${letter}`, `q${letter.toLowerCase()}-${i}`, q[letter.toLowerCase()], 'required')).join('')}</div>
    ${fieldSelect(`answer-${i}`, 'Clave privada', q.type === 'Múltiple'
      ? [['', 'Elegí dos o más opciones'], ['AB', 'A y B'], ['AC', 'A y C'], ['BC', 'B y C'], ['ABC', 'A, B y C']]
      : [['', 'Elegí una opción'], ['A', 'A'], ['B', 'B']], q.answer)}`}
    <div>${button('Quitar pregunta', 'question-remove', 'link danger', i)}</div></fieldset>`;
}

function actWeight(a) {
  return a.criteria.reduce((sum, c) => sum + Number(c.weight), 0);
}

function actReview(a) {
  return `<section class="panel act-section"><div><h3>Entrega</h3>
    <p>Zona horaria del aula · ${esc(room().zone)}</p></div>
    ${input('Fecha y hora límite (opcional)', 'due', actDueValue(a), 'type="datetime-local"')}
    <label class="act-choice"><input name="late" type="checkbox" ${a.late ? 'checked' : ''}>Permitir entregas tardías</label>
    </section><section class="act-section"><h3>Vista del estudiante</h3>${activityContent(a, true)}</section>`;
}

function activityContent(a, student = false, includeTitle = true) {
  const material = (a.materialIds || []).map(id => room().materials.find(m => m.id === id)).filter(Boolean);
  const instruction = a.body?.trim().split(/\n\s*\n/).filter(Boolean) || [];
  const delivery = a.type === 'TP'
    ? 'Podés escribir tu respuesta, adjuntar archivos o combinar ambas opciones.'
    : 'Respondé las preguntas y revisá tus respuestas antes de confirmar la entrega.';
  return `<article class="panel act-section act-consigna">
    <div class="row">${includeTitle ? tag(esc(actType(a.type)), 'violet') : ''}
      <span data-act-due ${a.due ? '' : 'hidden'}>${tag(a.due ? esc('Hasta el ' + actDueLabel(a)) : '', 'warm')}</span></div>
    ${includeTitle ? `<h3>${esc(a.title || 'Actividad sin título')}</h3>` : ''}
    ${a.objective ? `<div><h4>Objetivo</h4><p class="text">${esc(a.objective)}</p></div>` : ''}
    <div class="act-instruction"><h4>Qué tenés que hacer</h4>
      ${instruction.length ? instruction.map(paragraph => `<p class="text">${esc(paragraph)}</p>`).join('') : '<p>Consigna pendiente.</p>'}</div>
    <div><h4>Cómo entregar</h4><p>${delivery}</p></div>
    ${a.teacherComment ? `<div><h4>Comentario docente</h4><p class="text">${esc(a.teacherComment)}</p></div>` : ''}
    ${material.length ? `<div><h4>Materiales de referencia</h4><div class="act-section">${material.map(m => button(icon('file')+esc(m.title),'material-read','resource-link',m.id)).join('')}</div></div>` : ''}
    ${a.type === 'TP' || !a.questions.length ? '' : `<div class="act-section"><h4>Preguntas</h4>
    ${a.questions.map((q, i) => `<section class="act-question"><div class="row"><strong>Pregunta ${i + 1}</strong>
      <small>${actQuestionType(q.type)}${student ? '' : ' · ' + esc(q.points) + ' pts'}</small></div><p class="text">${esc(q.text)}</p>
      ${q.type === 'Abierta' ? '' : `<ol type="A">${actOptions(q).map(letter => `<li>${esc(q[letter.toLowerCase()])}</li>`).join('')}</ol>`}
      ${!student && q.type !== 'Abierta' ? `<small>Clave privada · ${esc(q.answer?.split('').join(', '))}</small>` : ''}
    </section>`).join('')}</div>`}
    ${a.criteria.length ? `<div><h4>Criterios de evaluación</h4><ul>${a.criteria.map(c =>
      `<li><strong>${esc(c.name)} · ${esc(c.weight)}%</strong><p class="text">${esc(c.evidence)}</p></li>`).join('')}</ul></div>` : ''}
  </article>`;
}

function leaveActivity(next) {
  if (!activity) return true;
  confirm('¿Salir del editor?', 'Tu avance se guarda como borrador privado para que puedas retomarlo.', 'Guardar y salir', () => {
    persistActivity(false, next);
    closeModal();
  });
  return false;
}

function activityError(message) {
  actError('activity-error', message);
}

function actError(id, message) {
  const el = main.querySelector(`#${id}`);
  if (!el) return;
  el.className = 'notice error';
  el.hidden = false;
  el.textContent = message;
  el.focus();
}

function validateActivity() {
  const a = activity;
  if (!a.objective.trim() || !a.title.trim() || !a.body.trim()) return 'Completá el objetivo, el título y la consigna.';
  if (a.title.length > 120) return 'El título puede tener hasta 120 caracteres.';
  if (a.type !== 'TP') {
    if (!a.questions.length) return 'Agregá al menos una pregunta.';
    for (const [i, q] of a.questions.entries()) {
      if (!q.text.trim() || !actWhole(q.points, 100)) return `Completá la consigna y los puntos de la pregunta ${i + 1}.`;
      if (q.type !== 'Abierta' && (!q.answer || actOptions(q).some(letter => !q[letter.toLowerCase()]?.trim()))) {
        return `Completá las opciones y la clave privada de la pregunta ${i + 1}.`;
      }
    }
  }
  if (a.criteria.some(c => !c.name.trim() || !c.evidence.trim() || !actWhole(c.weight, 100))) return 'Completá el nombre, el peso y la evidencia de cada criterio.';
  if (a.criteria.length && actWeight(a) !== 100) return 'Los pesos de la rúbrica tienen que sumar 100%.';
  return '';
}

function actWhole(value, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max;
}

function persistActivity(assign, next) {
  if (!canWrite() || !activity) return;
  if (assign) {
    const error = validateActivity();
    if (error) return activityError(error);
  }
  const a = activity, list = room().activities, index = list.findIndex(item => item.id === a.id);
  a.status = assign ? actPublished : 'Borrador';
  if (index < 0) list.unshift(a);
  else list[index] = a;
  activity = null;
  activityView = assign ? a.id : null;
  actSection = 'consigna';
  log(assign ? 'Actividad asignada' : 'Borrador de actividad guardado');
  save();
  if (next) return next();
  tell(assign ? 'Actividad asignada al aula.' : 'Borrador privado guardado.');
  main.querySelector('#activity-heading')?.focus();
}

function nextActivity() {
  if (!canWrite() || !activity) return;
  const a = activity;
  if (activityStep === 3) return persistActivity(true);
  if (activityStep === 2) {
    const error = validateActivity();
    if (error) return activityError(error);
  }
  if (activityStep === 1 && !a.objective.trim()) return activityError('Escribí el objetivo de aprendizaje.');
  if (activityStep === 1 && a.method === 'ai' && !a.generated) return actGenerate(a);
  activityStep++;
  actFocusHeading();
}

function actGenerate(a) {
  if (!actWhole(a.duration, 240) || (a.type !== 'TP' && !actWhole(a.count, 12))) return activityError('Ingresá una duración y una cantidad de preguntas dentro de los rangos indicados.');
  const form = main.querySelector('#activity-form');
  if (form.getAttribute('aria-busy') === 'true') return;
  form.setAttribute('aria-busy', 'true');
  form.querySelectorAll('input, textarea, select, button[type=submit]').forEach(el => el.disabled = true);
  form.insertAdjacentHTML('afterbegin', loadingState('Foxy prepara un ejemplo', 'Vas a poder editar la propuesta.'));
  window.setTimeout(() => {
    if (activity !== a || !canWrite() || activityStep !== 1) return;
    const topic = topics().find(({ t }) => t.id === a.topic)?.t.title || room().subject || 'el tema de la clase';
    a.title ||= `Explorar ${topic}`.slice(0, 120);
    a.body ||= a.type === 'TP'
      ? `Elegí dos ejemplos de ${topic}. Explicá qué tienen en común, en qué se diferencian y cómo se relacionan con el objetivo de la clase.`
      : `Usá lo trabajado sobre ${topic} para responder. Incluí un ejemplo en las preguntas de desarrollo.`;
    const prompts = [
      `Explicá con tus palabras una idea central sobre ${topic}.`,
      '¿Qué ejemplo de la clase ayuda a explicar esa idea? Justificá tu elección.',
      'Describí una situación nueva en la que podrías aplicar lo aprendido.',
      'Compará dos ejemplos y explicá en qué se diferencian.',
    ];
    if (a.type !== 'TP' && !a.questions.length) a.questions = Array.from({ length: Number(a.count) }, (_, i) => ({
      type: 'Abierta', points: 10, text: prompts[i] || `Agregá un ejemplo distinto y explicá cómo lo relacionás con el objetivo (pregunta ${i + 1}).`,
    }));
    if (a.source && !a.materialIds.includes(a.source)) a.materialIds.push(a.source);
    a.generated = true;
    activityStep = 2;
    actFocusHeading();
  }, 700);
}

function syncActivityField(el) {
  if (el.form?.id !== 'activity-form' || !activity || !el.name) return;
  if (el.type === 'radio' && !el.checked) return;
  const [field, index] = el.name.split('-');
  const value = el.type === 'checkbox' ? el.checked : el.value;
  const criteria = { criterion: 'name', weight: 'weight', evidence: 'evidence' };
  const questions = { qtype: 'type', question: 'text', points: 'points', qa: 'a', qb: 'b', qc: 'c', answer: 'answer' };
  if (el.name === 'act-material') {
    const ids = activity.materialIds.filter(id => id !== el.value);
    activity.materialIds = el.checked ? [...ids, el.value] : ids;
  } else if (criteria[field]) activity.criteria[index][criteria[field]] = value;
  else if (questions[field]) activity.questions[index][questions[field]] = value;
  else activity[el.name] = value;
  const total = main.querySelector('#weight-total');
  if (total) total.textContent = actWeight(activity) + '%';
}

function changeActivityField(el) {
  if (el.form?.id !== 'activity-form' || !activity) return;
  if (el.name === 'due') {
    const due = main.querySelector('[data-act-due]');
    due.hidden = !activity.due;
    due.firstElementChild.textContent = activity.due ? 'Hasta el ' + actDueLabel(activity) : '';
    return;
  }
  if (el.name === 'unit') activity.topic = '';
  if (el.name.startsWith('qtype-')) activity.questions[Number(el.name.slice(6))].answer = '';
  if (['method', 'type', 'unit'].includes(el.name) || el.name.startsWith('qtype-')) {
    const selector = `[name="${el.name}"]${el.type === 'radio' ? ':checked' : ''}`;
    render();
    main.querySelector(selector)?.focus();
  }
}

function activityDetail() {
  const a = actCurrent();
  const student = isStudent();
  if (student) return actStudentDetail(a);
  const assigned = a.status === actPublished;
  return `<div class="act-workspace act-flow">
    <div>${button('‹ Actividades', 'activity-list', 'link')}</div>
    ${head(`<span tabindex="-1" id="activity-heading">${esc(a.title || 'Actividad sin título')}</span>`, esc(actType(a.type)),
      `<div class="row">${tag(esc(a.status), assigned ? 'mint' : 'warm')}
      ${studentPreview ? button('Volver al detalle docente', 'student-preview') : button('Vista del estudiante', 'student-preview')}
      ${!assigned && canWrite() ? button('Continuar edición', 'activity-edit', 'primary', a.id) : ''}</div>`)}
    ${studentPreview ? `<p class="notice">Vista de la consigna para el estudiante.</p>${activityContent(a, true, false)}` :
      `${assigned ? `<nav class="act-nav" aria-label="Detalle de actividad">${[['consigna', 'Consigna'], ['entregas', 'Entregas']].map(([value, label]) =>
        `<button type="button" data-action="act-section" data-value="${value}" aria-pressed="${actSection === value}">${label}</button>`).join('')}</nav>` : ''}
      ${assigned && actSection === 'entregas' ? actTeacherSubmissions(a) : activityContent(a, false, false)}`}
    </div>`;
}

function actTeacherStatus(s) {
  if (s?.reopened) return 'Reentrega habilitada';
  const received = actReceipt(s);
  if (actReceiptGrade(s, received)) return 'Calificada';
  if (received && s.review) return 'Corrección privada';
  if (received) return 'Entregada';
  return s?.startedAt ? 'En curso' : 'Pendiente';
}

function actTeacherSubmissions(a) {
  const learners = room().students;
  const selected = learners.find(person => person.id === actSelectedStudent);
  if (selected && actReceipt(actSub(a, selected.id))) return actTeacherReview(a, selected);
  const statuses = ['Pendiente', 'En curso', 'Entregada', 'Corrección privada', 'Calificada', 'Reentrega habilitada'];
  const received = learners.filter(person => actReceipt(actSub(a, person.id))).length;
  const rows = learners.filter(person => !actSubmissionFilter || actTeacherStatus(actSub(a, person.id)) === actSubmissionFilter);
  return `<section class="act-section"><div class="act-submissions-head">
    <div><h3>Entregas del aula</h3><p>${received} de ${learners.length} estudiantes con entrega confirmada</p></div>
    ${fieldSelect('act-submission-status', 'Estado', [['', 'Todos los estados'], ...statuses.map(s => [s, s])], actSubmissionFilter)}</div>
    <div class="act-list">${rows.map(person => {
      const s = actSub(a, person.id), receipt = actReceipt(s), status = actTeacherStatus(s);
      return `<article class="panel act-list-item"><div><h4>${esc(person.name)}</h4>
      <div class="row">${tag(status, receipt ? 'mint' : 'warm')}
      ${receipt ? `<small>${receipt.late ? 'Tarde' : 'A tiempo'} · ${actDate.format(new Date(receipt.receivedAt))} h</small>` : ''}</div></div>
      ${receipt ? button('Abrir entrega', 'act-open-submission', '', person.id) : ''}</article>`;
    }).join('') || empty(learners.length ? 'No hay estudiantes con este estado.' : 'Todavía no hay estudiantes en el aula.')}</div></section>`;
}

function actFilesMarkup(files) {
  return files?.length ? `<ul class="act-files">${files.map(file =>
    `<li>${icon('file')} ${esc(file.name)} <small>· ${Math.max(1, Math.round(file.size / 1024))} KB</small></li>`).join('')}</ul>` : '';
}

function actEvidence(a, receipt, teacher = false) {
  if (a.type === 'TP') return `<section class="panel act-section"><h3>Trabajo presentado</h3>
    ${receipt.text?.trim() ? `<p class="text">${esc(receipt.text)}</p>` : '<p>Sin comentario escrito.</p>'}
    ${receipt.files?.length ? `<div><h4>Adjuntos</h4>${actFilesMarkup(receipt.files)}<p>Archivos de ejemplo · nombre y tamaño.</p></div>` : ''}</section>`;
  const title = a.type === 'Evaluación' ? 'Respuestas del intento' : 'Respuestas del cuestionario';
  return `<section class="panel act-section"><h3>${title}</h3>
    ${a.questions.map((q, i) => {
      const answer = receipt.answers?.[i];
      const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
      return `<section class="act-question"><div class="row"><strong>Pregunta ${i + 1}</strong><small>${actQuestionType(q.type)}</small></div>
        <p class="text">${esc(q.text)}</p>
        <div class="act-answer"><strong>Respuesta</strong>
        ${q.type === 'Abierta' ? `<p class="text">${esc(answer?.trim() || 'Sin responder')}</p>` :
          selected.length ? `<ul>${selected.map(letter => `<li>${esc(letter)}. ${esc(q[letter.toLowerCase()])}</li>`).join('')}</ul>` : '<p>Sin responder</p>'}</div>
        ${teacher && q.type !== 'Abierta' ? `<small>Clave privada · ${esc(q.answer?.split('').join(', '))}</small>` : ''}</section>`;
    }).join('')}</section>`;
}

function actReceiptLabel(s) {
  const first = s.receipts[0], receipt = actReceipt(s);
  return `${s.receipts.length === 1 ? 'Entrega recibida' : 'Reentrega recibida'} · ${actDate.format(new Date(receipt.receivedAt))} h · ${first.late ? 'Tarde' : 'A tiempo'}`;
}

function actClosed(a) {
  return Boolean(a.due && !a.late && actDue(a) < new Date());
}

function actStudentEditable(a) {
  const s = actSub(a);
  return Boolean(canParticipate() && a?.status === actPublished && (s?.reopened || (!actClosed(a) && !actReceipt(s))));
}

function actStudentDetail(a) {
  const s = actSub(a), receipt = actReceipt(s);
  const editable = actStudentEditable(a);
  const status = studentActivitySummary(a);
  return `<div class="act-workspace act-flow"><div>${button('‹ Actividades', 'activity-list', 'link')}</div>
    ${head(`<span tabindex="-1" id="activity-heading">${esc(a.title)}</span>`, esc(actType(a.type)), tag(esc(status.label),actStatusTone(status.label)))}
    ${editable?`<nav class="student-journey" aria-label="Pasos de tu entrega">${['Preparar','Revisar','Entregar'].map((label,i)=>`<span ${i===(actStudentMode==='review'?1:0)?'aria-current="step"':''}><b>${i+1}</b>${label}</span>`).join('')}</nav>`:''}
    ${actStudentMode === 'edit' && editable && s?.startedAt ? actStudentEditor(a, s)
      : actStudentMode === 'review' && editable && s?.startedAt ? actStudentReview(a, s)
      : `${editable?`<section class="student-next-action"><div><strong>${s?.startedAt?'Tu borrador está listo para continuar':s?.reopened?'Podés preparar una nueva entrega':'Primero leé la consigna'}</strong><p>${actDueLabel(a)} · ${s?.startedAt?'Todavía no lo recibió tu docente.':'Podés revisar tu trabajo antes de enviarlo.'}</p></div>${button(s?.startedAt?'Continuar borrador':a.type==='Evaluación'?'Iniciar evaluación':'Preparar entrega','act-start','primary')}</section>`:''}${studentActivityResult(a) ? `<section class="panel act-section">${actReceiptGrade(s,receipt)?'':'<p class="notice">Devolución de la entrega anterior. La nueva recepción todavía está pendiente de corrección.</p>'}${actPublishedGrade(a, studentActivityResult(a))}</section><details class="panel act-optional"><summary>Volver a consultar la consigna</summary>${activityContent(a, true, false)}</details>` : activityContent(a, true, false)}
      ${receipt ? `<section class="panel act-section student-receipt"><div><h3>Comprobante de entrega</h3>
        <p>${esc(actReceiptLabel(s))} · ${esc(room().zone)}</p></div>
        <details><summary>Ver mi entrega</summary>${actEvidence(a, receipt)}</details>
        ${!studentActivityResult(a) ? '<p>La devolución aparecerá acá cuando tu docente la publique.</p>' : ''}</section>` : ''}
      ${!editable&&!receipt&&actClosed(a)?'<p class="notice">Terminó el plazo de entrega. Podés consultar la consigna.</p>':''}`}</div>`;
}

function actStudentEditor(a, s) {
  return `<section class="act-section">
    <details class="panel act-optional"><summary>Consultar consigna</summary>${activityContent(a, true)}</details>
    <form id="act-student-form" class="act-section" novalidate>
      <div class="row between"><h3>${a.type === 'TP' ? 'Tu entrega' : 'Tus respuestas'}</h3><p id="act-save-status" role="status">${storage?'Borrador guardado en este navegador':'Guardado local no disponible: mantené esta página abierta'}</p></div>
      <p id="act-student-error" role="alert" tabindex="-1" hidden></p>
      ${a.type === 'TP' ? `<div class="panel act-section">
      ${area('Comentario o respuesta', 'act-response', s.text, '', 5)}
      <label class="student-file-picker">${icon('folder')}Agregar archivos<input id="act-student-files" type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.zip"></label>
      <p>Hasta 5 archivos de 50 MB cada uno. En esta maqueta se guarda el nombre y el tamaño.</p>
      ${actFiles.length ? `<div class="student-selected-files"><strong>Seleccionados · falta subirlos</strong>${actFilesMarkup(actFiles)}${button('Subir al borrador', 'act-attach')}<p>Subirlos no entrega la actividad.</p></div>` : ''}
      ${s.files.map((file, i) => `<div class="act-list-item"><span>${esc(file.name)}</span>${button('Quitar ' + esc(file.name), 'act-remove-file', 'link', i)}</div>`).join('')}</div>`
      : a.questions.map((q, i) => actStudentQuestion(q, i, s.answers[i])).join('')}
      <div class="act-footer">${button('Volver a la consigna', 'act-to-detail')}
      <button type="submit" class="primary">Revisar entrega</button></div>
    </form></section>`;
}

function actStudentQuestion(q, i, response) {
  const value = Array.isArray(response) ? response : [response];
  return `<fieldset class="panel act-question"><legend>Pregunta ${i + 1} · ${actQuestionType(q.type)}</legend>
    <p class="text" id="act-statement-${i}">${esc(q.text)}</p>
    ${q.type === 'Abierta' ? area('Tu respuesta', `act-q-${i}`, response, `aria-describedby="act-statement-${i}"`)
      : `<small>${q.type === 'Múltiple' ? 'Elegí todas las opciones que correspondan.' : 'Elegí una opción.'}</small>
      ${actOptions(q).map(letter => `<label class="act-choice"><input type="${q.type === 'Múltiple' ? 'checkbox' : 'radio'}" name="act-q-${i}" value="${letter}"
        aria-describedby="act-statement-${i}" ${value.includes(letter) ? 'checked' : ''}> ${esc(q[letter.toLowerCase()])}</label>`).join('')}`}
  </fieldset>`;
}

function actStudentReview(a, s) {
  const missing = a.type === 'TP' ? 0 : a.questions.filter((_, i) => !s.answers[i]?.length || (typeof s.answers[i] === 'string' && !s.answers[i].trim())).length;
  return `<section class="act-section"><h3>Revisá antes de entregar</h3>
    ${missing ? `<p class="notice act-caution">Te quedan ${missing} ${missing === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}. Cada respuesta en blanco vale 0 puntos.</p>` : ''}
    ${actEvidence(a, s)}<p class="notice">Al confirmar, tu docente recibirá este trabajo. Para volver a entregar, necesitarás que habilite una reentrega.</p>
    <div class="act-footer">${button('Volver a editar', 'act-start')}${button('Confirmar y entregar', 'act-submit', 'primary')}</div></section>`;
}

function actStart(a) {
  if (!actStudentEditable(a)) return;
  const enter = () => {
    if (!actStudentEditable(a)) return;
    a.submissions ||= {};
    a.submissions[actLearner] ||= actEmpty();
    const s = a.submissions[actLearner];
    s.startedAt ||= new Date().toISOString();
    actStudentMode = 'edit';
    save();
    actFocusHeading();
  };
  if (a.type === 'Evaluación' && !actSub(a)?.startedAt) return confirm('¿Iniciar la evaluación?', 'Vas a abrir un intento. Podés guardar tus respuestas y revisarlas antes de confirmar la entrega.', 'Iniciar intento', () => {
    closeModal();
    enter();
  });
  enter();
}

function actSubmit(a) {
  if (!actStudentEditable(a) || actStudentMode !== 'review' || !actSub(a)?.startedAt) return;
    const s = actSub(a);
    const now = new Date();
    s.receipts.push({ answers: structuredClone(s.answers), text: s.text, files: structuredClone(s.files), receivedAt: now.toISOString(),
      late: s.receipts[0]?.late ?? Boolean(a.due && actDue(a) < now) });
    s.reopened = false;
    actStudentMode = '';
    actFiles = [];
    save();
    tell('Entrega enviada. Tu docente ya puede revisarla.');
    main.querySelector('#activity-heading')?.focus();
}

function actRecordResponse(el) {
  const a = actCurrent(), s = actSub(a);
  if (el.form?.id !== 'act-student-form' || !actStudentEditable(a) || !s?.startedAt) return;
  if (el.name === 'act-response') s.text = el.value;
  else if (el.name.startsWith('act-q-')) {
    const i = Number(el.name.slice(6));
    if (el.type === 'checkbox') {
      const checked = new Set(s.answers[i] || []);
      if (el.checked) checked.add(el.value);
      else checked.delete(el.value);
      s.answers[i] = [...checked].sort();
    } else s.answers[i] = el.value;
  } else return;
  save();
  const status = main.querySelector('#act-save-status');
  if (status) status.textContent = storage?'Borrador guardado en este navegador':'No se pudo guardar. Mantené esta página abierta.';
}

function actSelectFiles(el) {
  const a = actCurrent(), s = actSub(a);
  if (!actStudentEditable(a) || !s?.startedAt) return;
  const files = [...el.files];
  actFiles = [];
  if (s.files.length + files.length > 5 || files.some(file => file.size > 50 * 1024 * 1024)) {
    render();
    return actError('act-student-error', 'Podés adjuntar hasta 5 archivos de 50 MB cada uno.');
  }
  actFiles = files.map(({ name, size }) => ({ name, size }));
  render();
  main.querySelector(actFiles.length ? '[data-action="act-attach"]' : '#act-student-files')?.focus();
}

Object.assign(actions, {
  'act-student-open':id=>{
    actions['activity-read'](id);
    const a=actCurrent();
    if(!isStudent()||!a)return;
    if(actStudentEditable(a)&&actSub(a)?.startedAt)return actStart(a);
    if(studentActivitySummary(a).label==='Entregada') {
      const receipt=main.querySelector('.student-receipt details');
      if(receipt){receipt.open=true;receipt.scrollIntoView({block:'start'});receipt.querySelector('summary')?.focus();}
    }
  },
  'act-activity-submissions':id=>{
    if(isStudent())return;
    actions['activity-read'](id);
    actSection='entregas';actFocusHeading();
  },
  'activity-new': topic => startActivity('', topic),
  'activity-edit': id => startActivity(id),
  'activity-read': id => {
    const a = room()?.activities.find(item => item.id === id);
    if (!a || (isStudent() && a.status !== actPublished)) return;
    tab = 'Actividades';
    activity = null;
    activityView = id;
    studentPreview = false;
    actSection = 'consigna';
    actSelectedStudent = '';
    actSubmissionFilter = '';
    actStudentMode = '';
    actFiles = [];
    actFocusHeading();
  },
  'activity-list': () => {
    activityView = null;
    actStudentMode = '';
    actFiles = [];
    render();
    main.querySelector('[name="act-list-type"]')?.focus();
  },
  'student-preview': () => {
    if (isStudent()) return;
    studentPreview = !studentPreview;
    actFocusHeading();
  },
  'activity-back': () => {
    if (activityStep === 1) return leaveActivity(actFocusHeading);
    activityStep--;
    actFocusHeading();
  },
  'activity-save': () => persistActivity(false),
  'question-add': () => {
    if (!activity || activity.questions.length >= 12) return;
    activity.questions.push({ type: 'Abierta', text: '', points: 10 });
    render();
    main.querySelector(`[name="question-${activity.questions.length - 1}"]`)?.focus();
  },
  'question-remove': index => {
    activity.questions.splice(Number(index), 1);
    render();
    (main.querySelector(`[name="question-${index}"]`) || main.querySelector('[data-action="question-add"]'))?.focus();
  },
  'criterion-add': () => {
    if (!activity || activity.criteria.length >= 12) return;
    activity.criteria.push({ name: '', weight: '', evidence: '' });
    render();
    main.querySelector(`[name="criterion-${activity.criteria.length - 1}"]`)?.focus();
  },
  'criterion-remove': index => {
    activity.criteria.splice(Number(index), 1);
    render();
    const add = main.querySelector('[data-action="criterion-add"]');
    add.closest('details').open = true;
    (main.querySelector(`[name="criterion-${index}"]`) || add)?.focus();
  },
  weights: () => {
    const n = activity.criteria.length;
    activity.criteria.forEach((c, i) => { c.weight = Math.floor(100 / n) + (i < 100 % n ? 1 : 0); });
    render();
    main.querySelector('[data-action="weights"]')?.focus();
  },
  'act-section': value => {
    actSection = value;
    actSelectedStudent = '';
    render();
    main.querySelector('[data-action="act-section"][aria-pressed="true"]')?.focus();
  },
  'act-open-submission': id => {
    if (isStudent()) return;
    actSelectedStudent = id;
    render();
    main.querySelector('#act-submission-heading')?.focus();
  },
  'act-submission-list': () => {
    const previous = actSelectedStudent;
    actSelectedStudent = '';
    render();
    [...main.querySelectorAll('[data-action="act-open-submission"]')].find(el => el.dataset.value === previous)?.focus();
  },
  'act-start': () => actStart(actCurrent()),
  'act-to-detail': () => {
    actStudentMode = '';
    actFocusHeading();
  },
  'act-attach': () => {
    const a = actCurrent(), s = actSub(a);
    if (!actStudentEditable(a) || !actFiles.length) return;
    s.files.push(...actFiles);
    actFiles = [];
    save();
    render();
    main.querySelector('#act-student-files')?.focus();
    main.querySelector('#act-save-status').textContent = 'Adjuntos guardados en el borrador';
  },
  'act-remove-file': index => {
    const a = actCurrent(), s = actSub(a);
    if (!actStudentEditable(a)) return;
    s.files.splice(Number(index), 1);
    save();
    render();
    main.querySelector('#act-student-files')?.focus();
  },
  'act-submit': () => actSubmit(actCurrent()),
  'act-reopen': () => {
    const s = actSub(actCurrent(), actSelectedStudent);
    if (!canWrite() || !actReceipt(s) || s.reopened) return;
    confirm('¿Habilitar reentrega?', 'El estudiante podrá preparar un nuevo intento. La entrega anterior seguirá en el historial.', 'Habilitar reentrega', () => {
      if (!canWrite()) return closeModal();
      Object.assign(s, { reopened: true, startedAt: '', answers: {}, text: '', files: [] });
      delete s.review;
      delete s.reviewDraft;
      save();
      closeModal();
      tell('Reentrega habilitada.');
    });
  },
});

document.addEventListener('input', ({ target }) => {actRecordResponse(target);actCaptureReviewDraft(target);});
document.addEventListener('change', ({ target: el }) => {
  if (el.form?.id === 'act-student-form' && ['checkbox', 'radio'].includes(el.type)) actRecordResponse(el);
  if (el.id === 'act-student-files') return actSelectFiles(el);
  if (el.name === 'act-list-type') actListFilter.type = el.value;
  else if (el.name === 'act-list-status') actListFilter.status = el.value;
  else if (el.name === 'act-submission-status') actSubmissionFilter = el.value;
  else return;
  render();
  main.querySelector(`[name="${el.name}"]`)?.focus();
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id === 'act-review-form') {
    event.preventDefault();
    return actSaveReview(form);
  }
  if (form.id !== 'act-student-form') return;
  event.preventDefault();
  const a = actCurrent(), s = actSub(a);
  if (!actStudentEditable(a) || !s?.startedAt) return;
  if (actFiles.length) return actError('act-student-error', 'Adjuntá los archivos seleccionados antes de revisar la entrega.');
  if (a.type === 'TP' && !s.text.trim() && !s.files.length) return actError('act-student-error', 'Escribí una respuesta o adjuntá un archivo para continuar.');
  actStudentMode = 'review';
  actFocusHeading();
});

initActivityExamples();
