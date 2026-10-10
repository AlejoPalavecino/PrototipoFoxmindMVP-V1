import type { useAppContext } from '../../context';

export function assertNavigationTypes(
  setView: ReturnType<typeof useAppContext>['setView'],
): void {
  setView('dashboard');
  setView('agenda');
  setView('aulas');
  setView('progreso');
  setView('copiloto');
  setView('mensajes');
  setView('config');
  setView('estudia');
  setView('');

  setView('aulas', {});
  setView('aulas', undefined);
  setView('aulas', { aulaId: 'class-1' }, 'push');
  setView('aulas', undefined, 'replace');
  setView('mensajes', { conversationId: 'conversation-1' }, 'replace');
  // @ts-expect-error Invalid history modes are rejected.
  setView('aulas', undefined, 'pop');
  // @ts-expect-error Replace mode must not widen the destination payload.
  setView('copiloto', { conversationId: 'conversation-1' }, 'replace');
  setView('aulas', {
    openTask: true,
    subject: 'Mathematics',
    openAulaId: 'class-1',
    taskTitle: 'Practice',
    aulaId: 'class-1',
  });
  setView('aulas', {
    openTask: undefined,
    subject: undefined,
    openAulaId: undefined,
    taskTitle: undefined,
    aulaId: undefined,
  });
  setView('copiloto', { initialPrompt: 'Help me study' });
  setView('mensajes', { conversationId: 'conversation-1', contactId: '1' });

  // @ts-expect-error Unknown destination literals must be rejected.
  setView('unknown-destination');
  // @ts-expect-error Dashboard does not accept an object payload.
  setView('dashboard', {});
  // @ts-expect-error Aula identifiers must be strings, not numbers.
  setView('aulas', { aulaId: 123 });
  // @ts-expect-error Copilot accepts initialPrompt, not conversationId.
  setView('copiloto', { conversationId: 'conversation-1' });
}
