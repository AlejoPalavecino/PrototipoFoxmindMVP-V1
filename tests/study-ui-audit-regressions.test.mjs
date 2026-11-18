import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const study = 'apps/web/src/features/study/';
const text = (node) => typeof node === 'string' || typeof node === 'number'
  ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const button = (tree, label) => descendants(tree, node =>
  node.type === 'button' && (node.props['aria-label'] ?? text(node)) === label)[0];

test('el asistente elige el aula del enlace sólo si el catálogo la autoriza y espera para guardar', async () => {
  const { StudyWizard } = componentWithPorts(study + 'folders/study-folder-wizard.tsx', {
    '../api.ts': { createStudyClient: () => ({
      create: async () => assert.fail('abrir el asistente no crea un borrador'),
    }) },
  });
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  try {
    for (const [classroomId, authorized] of [['room-id', true], ['foreign-id', false]]) {
      const view = hookView(StudyWizard, {
        catalog: { classrooms: [{ id: 'room-id', name: 'Fotografía', academicYear: 2026 }] },
        initialClassroomId: classroomId,
        onClose() {},
        onCreated() {},
      });
      try {
        await view.flush();
        const fields = descendants(view.tree, node => node.type === 'input');
        fields[0].props.onChange({ target: { value: 'Mi carpeta' } });
        fields[1].props.onChange({ target: { value: 'Fotografía' } });
        await view.flush();
        descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
        await view.flush();
        if (authorized) {
          const classroom = descendants(view.tree, node => node.type === 'input' && node.props.name === 'study-classroom')[0];
          assert.equal(classroom?.props.checked, true);
          assert.equal(button(view.tree, 'Revisar mi recorrido')?.props.disabled, false);
        } else {
          assert.equal(descendants(view.tree, node => node.type === 'input' && node.props.name === 'study-classroom').length, 0);
        }
      } finally {
        view.close();
      }
    }
  } finally {
    globalThis.window = previousWindow;
  }
});

test('la carpeta abre sus opciones y conserva la operación de archivar o reactivar', async (t) => {
  const frame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0;
  t.after(() => { globalThis.requestAnimationFrame = frame; });
  const { StudyWorkspace } = componentWithPorts(study + 'ui/study-workspace.tsx', {
    '../../../shared/use-chat-attachments': { useChatAttachments: () => ({ items: [] }) },
    '../../../../../shared-ui/use-chat-follow': { useChatFollow: () => ({}) },
  });
  for (const [status, action] of [['ACTIVE', 'ARCHIVE'], ['ARCHIVED', 'REACTIVATE']]) {
    const sent = [];
    const view = hookView(StudyWorkspace, {
      detail: {
        folder: { id: 'folder', name: 'Carpeta', status, units: [] },
        conversations: [], creations: [], sources: [], practices: [], exams: [],
      },
      catalog: { classrooms: [] }, run: async (name) => { sent.push(name); return {}; },
    });
    try {
      await view.flush();
      const layout = descendants(view.tree, node => node.type?.name === 'FoxyChatLayout')[0];
      button(layout.props.context, 'Opciones de la carpeta').props.onClick({ currentTarget: {} });
      await view.flush();
      button(view.tree, status === 'ARCHIVED' ? 'Reactivar carpeta' : 'Archivar carpeta').props.onClick();
      await view.flush();
      assert.deepEqual(sent, [action]);
    } finally {
      view.close();
    }
  }
});

test('ejercicios conservan la configuración elegida y los intentos muestran su estado', () => {
  const { StudyToolsPanel } = loadTsModule(study + 'tools/study-tools-panel.tsx');
  const { StudyToolDialog } = loadTsModule(study + 'tools/study-tool-dialog.tsx');
  const { StudyCreationsPanel } = loadTsModule(study + 'creations/presentation/study-creations-panel.tsx');
  const selected = [];
  const tools = StudyToolsPanel({ onChoose: value => selected.push(value) });
  descendants(tools, node => node.type === 'button' && text(node).includes('Crear ejercicios'))[0].props.onClick();
  assert.equal(selected[0].kind, 'EXERCISE');
  const dialog = StudyToolDialog({
    kind: 'EXERCISE', topics: [], selected: [], count: 7, difficulty: 'HARD',
    onCount: value => selected.push(value), onDifficulty: value => selected.push(value),
  });
  const count = descendants(dialog, node => node.type === 'input' && node.props.type === 'number')[0];
  const difficulty = descendants(dialog, node => node.type === 'select')[0];
  assert.equal(count.props.value, 7);
  assert.equal(difficulty.props.value, 'HARD');
  count.props.onChange({ target: { value: '3' } });
  difficulty.props.onChange({ target: { value: 'EASY' } });
  assert.deepEqual(selected.slice(1), [3, 'EASY']);
  const items = [{ id: 'old', title: 'Luz', kind: 'QUIZ', status: 'FINALIZED' },
    { id: 'new', title: 'Luz', kind: 'QUIZ', status: 'ACTIVE', attemptNumber: 2 }];
  const creations = StudyCreationsPanel({ matchingCreations: [], matchingPractices: items, matchingPlans: [] });
  const rows = descendants(creations, node => node.type === 'button' && node.props.className === 'study-exact-creation-item');
  assert.match(text(rows[0]), /Intento 1 · Finalizada/);
  assert.match(text(rows[1]), /Intento 2 · Sin empezar/);
});

test('editar una sesión permite guardar un aviso de 15 minutos sin cambiar su horario', () => {
  const { renderStudyExamSessionEditor } = loadTsModule(study + 'practice/exam-planning/study-exam-session-editor.tsx');
  const editing = { id: 'session', minutes: 25, title: 'Repasar', startAt: '2026-12-01T18:00:00Z', reminderMinutes: null };
  let updated;
  const dialog = renderStudyExamSessionEditor({ editing, local: value => value.slice(0, 16), setEditing: value => { updated = value; } });
  const reminder = descendants(dialog, node => node.type === 'select')[0];
  reminder.props.onChange({ target: { value: '15' } });
  assert.deepEqual(updated, { ...editing, reminderMinutes: 15 });
});

test('biblioteca ofrece recuperar el plan aprobado y editar materiales propios', async () => {
  const { StudyLibrary } = componentWithPorts(study + 'ui/study-library.tsx', {});
  const material = { id: 'notes', title: 'Notas', fileId: 'notes-file', topicIds: ['topic'] };
  const folder = { id: 'folder', status: 'ACTIVE', planFileId: 'plan-file', units: [], materials: [material] };
  const view = hookView(StudyLibrary, {
    catalog: { classrooms: [] },
    detail: { folder, sources: [
      { ...material, kind: 'MATERIAL', origin: 'OWN', available: true, extension: 'pdf' },
      { id: 'shared', title: 'Apunte del aula', kind: 'MATERIAL', origin: 'CLASSROOM', available: true },
      { id: 'plan', title: 'Plan', fileId: folder.planFileId, kind: 'PLAN', origin: 'OWN', available: true, extension: 'pdf' },
    ] },
  });
  try {
    await view.flush();
    assert.ok(button(view.tree, 'Editar Notas'));
    assert.equal(button(view.tree, 'Editar Apunte del aula'), undefined);
    button(view.tree, 'Plan de estudio').props.onClick();
    await view.flush();
    assert.ok(button(view.tree, 'Abrir plan'));
    const download = descendants(view.tree, node => node.type === 'a' && text(node) === 'Descargar plan')[0];
    assert.equal(download.props.href, '/api/v1/study-folders/folder/uploads/plan-file/file?mode=download');
  } finally {
    view.close();
  }
});

test('la colección filtra año, vínculo y texto y permite abrir una carpeta archivada', async () => {
  const { StudyCollectionView } = componentWithPorts(study + 'folders/study-folder-collection.tsx', {});
  const entered = [];
  const view = hookView(StudyCollectionView, {
    catalog: {
      classrooms: [{ id: 'aula', name: 'Aula de arte' }],
      items: [
        { id: 'art', name: 'Cuaderno', subject: 'Arte', status: 'ACTIVE', academicYear: 2026, linkedClassroomId: 'aula' },
        { id: 'math', name: 'Matemática', status: 'ACTIVE', academicYear: 2025 },
        { id: 'archived', name: 'Archivo de Arte', status: 'ARCHIVED', academicYear: 2026, linkedClassroomId: 'aula' },
      ],
    },
    onEnter: id => entered.push(id),
  });
  const cards = () => descendants(view.tree, node => node.props.className === 'study-exact-card');
  try {
    await view.flush();
    assert.equal(cards().length, 2);
    const [year, classroom] = descendants(view.tree, node => node.type === 'select');
    year.props.onChange({ target: { value: '2026' } });
    classroom.props.onChange({ target: { value: 'aula' } });
    const query = descendants(view.tree, node => node.type === 'input' && node.props.type === 'search')[0];
    query.props.onChange({ target: { value: 'arte' } });
    await view.flush();
    assert.equal(cards().length, 1);
    assert.match(text(cards()[0]), /Cuaderno/);
    button(view.tree, 'Archivadas1').props.onClick();
    await view.flush();
    assert.equal(cards().length, 1);
    assert.match(text(cards()[0]), /Archivo de Arte/);
    cards()[0].props.onClick();
    assert.deepEqual(entered, ['archived']);
  } finally {
    view.close();
  }
});

test('apuntes ofrecen DOCX y TXT a partir de la misma versión guardada', async () => {
  const downloads = [];
  const { StudyCreationEditor } = componentWithPorts(study + 'creations/study-creation-editor.tsx', {
    '../../../../../shared-ui/text-document': {
      downloadTextDocument: (...args) => downloads.push(['docx', ...args]),
      downloadMarkdownText: (...args) => downloads.push(['txt', ...args]),
    },
  });
  const view = hookView(StudyCreationEditor, {
    creation: { id: 'note', title: 'Luz', markdown: '# Exposición revisada', kind: 'NOTE' },
  });
  try {
    await view.flush();
    button(view.tree, 'Descargar Word').props.onClick();
    button(view.tree, 'Descargar TXT').props.onClick();
    assert.deepEqual(downloads, [
      ['docx', 'Luz', '# Exposición revisada'],
      ['txt', 'Luz', '# Exposición revisada'],
    ]);
  } finally {
    view.close();
  }
});
