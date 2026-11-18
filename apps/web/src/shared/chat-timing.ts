type Task = 'foxy' | 'study' | 'study.feedback';
type Stage = 'first_text' | 'final';
type Tracked = { started: number; firstText: boolean };
const pending: Record<Task, Map<string, Tracked>> = {
  foxy: new Map(), study: new Map(), 'study.feedback': new Map(),
};
const maxAgeMs = 10 * 60 * 1000;

export function startChatTiming(): number | undefined {
  if (typeof window !== 'undefined') return window.performance?.now?.();
}

export function trackChatTiming(task: Task, id: string, started: number | undefined) {
  if (started === undefined) return;
  const requests = pending[task];
  if (requests.size >= 32) {
    const oldest = requests.keys().next().value;
    if (oldest !== undefined) requests.delete(oldest);
  }
  requests.set(id, { started, firstText: false });
}

export function clearChatTiming(task: Task, id: string) {
  pending[task].delete(id);
}

export function commitChatTiming(task: Task, id: string, stage: Stage) {
  const tracked = pending[task].get(id);
  if (!tracked) return;
  const end = startChatTiming();
  if (end === undefined || end - tracked.started > maxAgeMs) {
    clearChatTiming(task, id);
    return;
  }
  if (stage === 'first_text' && tracked.firstText) return;
  if (stage === 'first_text') tracked.firstText = true;
  else clearChatTiming(task, id);
  try {
    const name = `foxmind.ai.${task}.presentation.${stage}`;
    const performance = window.performance;
    if (performance.getEntriesByName(name, 'measure').length >= 50) performance.clearMeasures(name);
    performance.measure(name, { start: tracked.started, end });
  } catch { /* User timing is best effort. */ }
}
