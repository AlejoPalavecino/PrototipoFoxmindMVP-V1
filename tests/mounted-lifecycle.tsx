import { StrictMode, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StudentActivityDetail } from '../src/components/aulas/StudentActivityDetail';
import { useStudentClassroomMembership } from '../src/features/classrooms/hooks/useStudentClassroomMembership';
import { StudentClassroomJoinDialog } from '../src/features/classrooms/components/student/StudentClassroomJoinDialog';
import { classroomRepository } from '../src/features/classrooms/data/inMemoryClassroomRepository';
import type { ClassroomJoinResult } from '../src/features/classrooms/application/classroomJoinState';
import type { SubmissionDelivery } from '../src/features/classrooms/model/Submission';
import { SharedMessagingHub } from '../src/components/messaging/SharedMessagingHub';
import { messagingStore } from '../src/features/messaging/messagingStore';
import type { Conversation } from '../src/types';
import { toast } from '../src/components/ui/Toaster';

const receipt = { assertions: [] as string[], errors: [] as string[], strictSetups: 0, strictCleanups: 0, restored: false };
declare global { interface Window { mountedLifecycleReceipt?: typeof receipt } }
const host = document.getElementById('fixture')!;
let root: Root | null = null;
function check(value: unknown, label: string): asserts value { if (!value) throw Error(label); }
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
async function until(predicate: () => unknown, label: string) {
  const deadline = performance.now() + 4000;
  while (!predicate()) { check(performance.now() < deadline, `Timeout: ${label}`); await frame(); }
}
function element<T extends Element = HTMLElement>(selector: string): T {
  const node = host.querySelector<T>(selector); check(node, `Missing ${selector}`); return node;
}
function button(text: string) {
  const node = [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
  check(node, `Missing button ${text}`); return node;
}
function click(node: Element) { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
async function input(selector: string, value: string) {
  const node = element<HTMLInputElement | HTMLTextAreaElement>(selector);
  const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true })); await frame();
  check(element<HTMLInputElement>(selector).value === value, 'real controlled input updated');
}
function Probe({ children }: { children: ReactNode }) {
  useEffect(() => { receipt.strictSetups++; return () => { receipt.strictCleanups++; }; }, []);
  return children;
}
async function mount(children: ReactNode) {
  root = createRoot(host); root.render(<StrictMode><Probe>{children}</Probe></StrictMode>);
  await until(() => host.childElementCount, 'React mount'); await frame();
}
function unmount() { root?.unmount(); root = null; }
const jobs: { reject: (error: Error) => void; promise: Promise<unknown> }[] = [];
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  const operation = { promise, resolve, reject, settled: false };
  void promise.then(() => { operation.settled = true; }, () => { operation.settled = true; });
  jobs.push({ reject, promise }); return operation;
}
const toasts: string[] = [];
const observeToast = (event: { message: string }) => { toasts.push(event.message); };
const activity = { id: 901, title: 'Lifecycle activity', type: 'Trabajo práctico', status: 'Pendiente', due: 'Hoy',
  description: 'Fixture', attachment: { name: 'Consigna.txt', size: '1 KB', url: '' } };
async function submissionDraft() {
  const file = new File(['original bytes'], 'original.txt', { type: 'text/plain' });
  const transfer = new DataTransfer(); transfer.items.add(file);
  element('[aria-label="Adjuntar archivos"]').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
  await input('#submission-comment', 'Original note'); return file;
}
function duplicate(action: () => void, calls: () => number, pendingSelector: string) {
  const before = calls();
  action();
  check(!element(pendingSelector).matches(':disabled'), 'first event has not rerendered disabled UI');
  action(); check(calls() === before + 1, 'synchronous duplicate gate before React rerender');
}
async function scenario(name: string, run: () => Promise<void>) {
  try { await run(); receipt.assertions.push(name); }
  catch (error) { receipt.errors.push(`${name}: ${(error as Error).message}`); }
  finally { unmount(); await frame(); }
}
async function run() {
  // Existing characterization seam: real runtime private fields, not a replacement store.
  const seam = messagingStore as unknown as { conversations: Conversation[]; listeners: Set<() => void> };
  check(Array.isArray(seam.conversations) && seam.listeners instanceof Set, 'real store seam unavailable');
  const originalConversations = seam.conversations, originalListeners = new Set(seam.listeners);
  const sendDescriptor = Object.getOwnPropertyDescriptor(messagingStore, 'sendMessage');
  const originalSend = messagingStore.sendMessage;
  const key = 'foxmind_shared_messages_v5', saved = localStorage.getItem(key);
  const seed = (id: string): Conversation => ({ id, type: 'direct', title: id,
    participants: [{ id: 'alumno-valentina', name: 'Valentina', role: 'alumno' }, { id: 'teacher', name: 'Teacher', role: 'docente' }],
    lastMessage: '', lastMessageTime: '', lastMessageSender: '', unreadCountAlumno: 0, unreadCountDocente: 0, messages: [] });
  seam.conversations = [seed('Lifecycle A'), seed('Lifecycle B')];
  toast.listeners.add(observeToast);
  try {
    await scenario('submission retry/file identity', async () => {
      let operation = deferred<void>(); const deliveries: SubmissionDelivery[] = [];
      await mount(<StudentActivityDetail activity={activity} onBack={() => { throw Error('unexpected back'); }}
        onDeliver={delivery => { deliveries.push(delivery); return operation.promise; }} />);
      const file = await submissionDraft();
      duplicate(() => click(button('Entregar Actividad')), () => deliveries.length, '#submission-comment');
      await until(() => element<HTMLInputElement>('#submission-comment').disabled, 'submission pending');
      check(element('[aria-busy="true"]'), 'submission accessible pending');
      operation.reject(Error('external failure'));
      await until(() => host.querySelector('[role="alert"]'), 'submission accessible error');
      check(element<HTMLInputElement>('#submission-comment').value === 'Original note', 'retained note');
      check(host.textContent.includes('original.txt'), 'retained file display');
      operation = deferred<void>(); click(button('Entregar Actividad'));
      check(deliveries.length === 2 && deliveries[1].attachments![0].file === file, 'retry retains original File identity');
      check(deliveries[1].text === deliveries[0].text && await file.text() === 'original bytes', 'retained payload text/bytes');
      operation.resolve(); await until(() => host.textContent.includes('Entregada'), 'submission confirmation');
    });
    await scenario('submission late confirmation guard', async () => {
      const operation = deferred<void>(); let calls = 0;
      await mount(<StudentActivityDetail activity={activity} onBack={() => {}} onDeliver={() => { calls++; return operation.promise; }} />);
      await submissionDraft(); click(button('Entregar Actividad')); check(calls === 1, 'late delivery started');
      unmount(); const before = toasts.length;
      operation.resolve(); await frame();
      check(toasts.length === before, 'late delivery must not publish a confirmation toast after unmount');
    });
    const classroom = classroomRepository.readMembership()[0]; check(classroom, 'join duplicate fixture requires existing classroom');
    let joinOperation = deferred<ClassroomJoinResult>(); const codes: string[] = [];
    function Membership() {
      const membership = useStudentClassroomMembership(code => { codes.push(code); return joinOperation.promise; });
      return <><button onClick={() => membership.setIsJoinModalOpen(true)}>Open join</button><StudentClassroomJoinDialog membership={membership} /></>;
    }
    async function openJoin(code: string) {
      click(button('Open join')); await until(() => host.querySelector('[role="dialog"]'), 'actual join dialog');
      await input('#student-classroom-invitation-code', code);
    }
    await scenario('join retry/code retention', async () => {
      await mount(<Membership />); await openJoin('KEEP-CODE');
      duplicate(() => click(button('Unirme al Aula')), () => codes.length, '#student-classroom-invitation-code');
      await until(() => host.querySelector('[role="dialog"][aria-busy="true"]'), 'join accessible pending');
      joinOperation.reject(Error('external failure'));
      await until(() => host.querySelector('[role="alert"]'), 'join accessible error');
      check(element<HTMLInputElement>('#student-classroom-invitation-code').value === 'KEEP-CODE', 'retained code');
      check(element('input').getAttribute('aria-describedby') === element('[role="alert"]').id, 'associated join error');
      joinOperation = deferred<ClassroomJoinResult>(); click(button('Reintentar inscripción'));
      check(codes.length === 2 && codes[1] === codes[0], 'same retry code');
      joinOperation.resolve({ status: 'duplicate', classroom });
      await until(() => !host.querySelector('[role="dialog"]'), 'join confirmation closes dialog');
      await openJoin(''); check(element<HTMLInputElement>('input').value === '', 'confirmed join resets code');
    });
    await scenario('join late confirmation guard', async () => {
      joinOperation = deferred<ClassroomJoinResult>(); await mount(<Membership />); await openJoin('OLD-CODE');
      click(button('Unirme al Aula')); const old = joinOperation; unmount();
      joinOperation = deferred<ClassroomJoinResult>(); await mount(<Membership />); await openJoin('NEW-CODE');
      const before = toasts.length; old.resolve({ status: 'duplicate', classroom }); await frame();
      check(toasts.length === before, 'stale join must not invoke confirmation toast');
      check(element<HTMLInputElement>('input').value === 'NEW-CODE' && host.querySelector('[role="dialog"]'), 'new dialog preserved');
    });
    let sendOperation = deferred<void>(); const sends: Parameters<typeof originalSend>[0][] = [];
    Object.defineProperty(messagingStore, 'sendMessage', { configurable: true, value: (params: Parameters<typeof originalSend>[0]) => {
      sends.push(params); return sendOperation.promise.then(() => originalSend.call(messagingStore, params));
    } });
    await scenario('message retry/draft retention', async () => {
      await mount(<SharedMessagingHub currentRole="alumno" initialConversationId="Lifecycle A" />);
      click(button('Duda de consigna')); await frame();
      await input('[aria-label="Mensaje"]', 'Original message');
      click(element('[title="Adjuntar archivo (PDF, Imagen, TP)"]')); await frame(); click(button('Borrador_Ensayo')); await frame();
      duplicate(() => click(element('[aria-label="Enviar mensaje"]')), () => sends.length, '[aria-label="Mensaje"]');
      await until(() => host.querySelector('fieldset[aria-busy="true"]'), 'message accessible pending');
      sendOperation.reject(Error('external failure')); await until(() => host.querySelector('fieldset [role="alert"]'), 'message accessible error');
      check(element<HTMLTextAreaElement>('[aria-label="Mensaje"]').value === 'Original message', 'retained message');
      check(host.querySelector('[aria-label="Quitar adjunto"]'), 'retained attachment');
      sendOperation = deferred<void>(); click(element('[aria-label="Reintentar envío"]'));
      check(sends.length === 2 && sends[1].attachment === sends[0].attachment && sends[1].categoryTag === sends[0].categoryTag
        && sends[1].text === sends[0].text, 'same message draft identity/text/tag on retry');
      sendOperation.resolve(); await until(() => element<HTMLTextAreaElement>('[aria-label="Mensaje"]').value === '', 'message confirmation reset');
      check(!host.querySelector('[aria-label="Quitar adjunto"]') && seam.conversations[0].messages.length === 1, 'real store appended once');
    });
    await scenario('message conversation-change guard', async () => {
      sendOperation = deferred<void>(); await mount(<SharedMessagingHub currentRole="alumno" initialConversationId="Lifecycle A" />);
      await input('[aria-label="Mensaje"]', 'Late A'); click(element('[aria-label="Enviar mensaje"]'));
      await frame(); click(button('Lifecycle B')); await frame(); click(button('Lifecycle A')); await frame();
      check(element<HTMLTextAreaElement>('[aria-label="Mensaje"]').value === '', 'A-B-A starts new composer visit');
      // onConfirmed writes height='auto'. A new visit's DOM marker makes that
      // callback observable even while the shared pending gate disables edits.
      const textarea = element<HTMLTextAreaElement>('[aria-label="Mensaje"]');
      check(textarea.matches(':disabled'), 'shared pending fieldset effectively disables new visit');
      textarea.style.height = '77px';
      const messageCount = seam.conversations[0].messages.length;
      sendOperation.resolve();
      await until(() => sendOperation.settled && seam.conversations[0].messages.length === messageCount + 1
        && !element('[aria-label="Mensaje"]').matches(':disabled')
        && !host.querySelector('fieldset[aria-busy="true"]'), 'late send settled and pending UI released');
      check(element<HTMLTextAreaElement>('[aria-label="Mensaje"]').style.height === '77px', 'stale onConfirmed did not touch new visit textarea');
      await input('[aria-label="Mensaje"]', 'New visit draft');
      check(!host.querySelector('fieldset [role="alert"]'), 'no stale send error');
    });
    await scenario('message late confirmation guard', async () => {
      sendOperation = deferred<void>(); await mount(<SharedMessagingHub currentRole="alumno" initialConversationId="Lifecycle A" />);
      click(element('[title="Grabar nota de voz"]')); await frame(); click(button('Enviar Audio'));
      await until(() => host.querySelector('fieldset[aria-busy="true"]'), 'voice send pending');
      unmount(); const before = toasts.length; sendOperation.resolve(); await frame();
      check(toasts.length === before, 'late voice send must not publish a confirmation toast after unmount');
    });
  } finally {
    unmount(); jobs.forEach(job => job.reject(Error('fixture cleanup'))); await Promise.allSettled(jobs.map(job => job.promise)); await frame();
    seam.conversations = originalConversations;
    if (sendDescriptor) Object.defineProperty(messagingStore, 'sendMessage', sendDescriptor); else Reflect.deleteProperty(messagingStore, 'sendMessage');
    toast.listeners.delete(observeToast);
    if (saved === null) localStorage.removeItem(key); else localStorage.setItem(key, saved);
    receipt.restored = seam.conversations === originalConversations && messagingStore.sendMessage === originalSend
      && localStorage.getItem(key) === saved && seam.listeners.size === originalListeners.size
      && [...originalListeners].every(listener => seam.listeners.has(listener)) && !toast.listeners.has(observeToast);
    if (receipt.restored) receipt.assertions.push('subscription cleanup');
    window.mountedLifecycleReceipt = receipt;
  }
}
void run().catch(error => { receipt.errors.push((error as Error).message); window.mountedLifecycleReceipt = receipt; });
