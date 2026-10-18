import type { AnswerConfirmation, QuestionAnswer } from './api.ts';

export const ANSWER_IDLE_MS = 2_000;
export interface AnswerInput { questionId: string; text: string; optionIds: string[] }
export type SaveState = 'saved' | 'pending' | 'saving' | 'error';
interface Entry { value: AnswerInput; generation: number; confirmedGeneration: number; state: SaveState }
interface Scheduler { set(callback: () => void, milliseconds: number): unknown; clear(handle: unknown): void }
const scheduler: Scheduler = { set: (callback, milliseconds) => setTimeout(callback, milliseconds),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/** Tab-memory only. Acknowledging generation N never acknowledges a later local edit. */
export class QuestionnaireDraft {
  private entries = new Map<string, Entry>();
  private save: (input: AnswerInput & { revision: string }) => Promise<AnswerConfirmation>;
  private changed: () => void;
  private clock: Scheduler;
  private timer: unknown;
  private pending: Promise<void> | null = null;
  private active = true;
  private epoch = 0;
  private deferred: { revision: string; answers: QuestionAnswer[] } | null = null;
  revision: string;
  error = '';

  constructor(options: { questionIds: string[]; answers: QuestionAnswer[]; revision: string;
    save: (input: AnswerInput & { revision: string }) => Promise<AnswerConfirmation>;
    changed: () => void; scheduler?: Scheduler }) {
    this.revision = options.revision; this.save = options.save; this.changed = options.changed; this.clock = options.scheduler ?? scheduler;
    for (const questionId of options.questionIds) {
      const answer = options.answers.find(item => item.questionId === questionId);
      this.entries.set(questionId, { value: { questionId, text: answer?.text ?? '', optionIds: [...answer?.optionIds ?? []] },
        generation: 0, confirmedGeneration: 0, state: 'saved' });
    }
  }

  get(questionId: string) { return this.entries.get(questionId)!; }
  get dirty() { return [...this.entries.values()].some(item => item.generation !== item.confirmedGeneration); }
  get saving() { return this.pending !== null; }
  edit(value: AnswerInput) {
    if (!this.active) return;
    const entry = this.get(value.questionId);
    entry.value = { ...value, optionIds: [...value.optionIds] }; entry.generation++; entry.state = 'pending'; this.error = '';
    this.clock.clear(this.timer);
    this.timer = this.clock.set(() => { void this.flush().catch(() => {}); }, ANSWER_IDLE_MS);
    this.changed();
  }

  /** Focus/refresh may update confirmed data, but must never replace unconfirmed edits or rewind the CAS revision. */
  receive(revision: string, answers: QuestionAnswer[]) {
    if (!this.active || BigInt(revision) < BigInt(this.revision)) return;
    if (this.pending) {
      if (!this.deferred || BigInt(revision) >= BigInt(this.deferred.revision)) this.deferred = { revision, answers };
      return;
    }
    this.revision = revision;
    for (const answer of answers) {
      const entry = this.entries.get(answer.questionId);
      if (entry && entry.generation === entry.confirmedGeneration && entry.state !== 'saving')
        entry.value = { questionId: answer.questionId, text: answer.text ?? '', optionIds: [...answer.optionIds] };
    }
    this.changed();
  }

  flush(): Promise<void> {
    this.clock.clear(this.timer);
    if (!this.active) return Promise.reject(new Error('Se perdió el control de edición. Consulta el estado confirmado.'));
    if (this.pending) return this.pending;
    const epoch = this.epoch;
    const work = async () => {
      while (this.active && epoch === this.epoch) {
        const entry = [...this.entries.values()].find(item => item.generation !== item.confirmedGeneration);
        if (!entry) return;
        const generation = entry.generation, value = { ...entry.value, optionIds: [...entry.value.optionIds] };
        entry.state = 'saving'; this.changed();
        try {
          const confirmed = await this.save({ ...value, revision: this.revision });
          if (!this.active || epoch !== this.epoch) throw new Error('Se perdió el control de edición.');
          if (!confirmed || !/^(0|[1-9][0-9]*)$/.test(confirmed.revision) || BigInt(confirmed.revision) <= BigInt(this.revision)
            || confirmed.answer?.questionId !== value.questionId || typeof confirmed.answer.savedAt !== 'string')
            throw new Error('El servidor no confirmó el guardado.');
          this.revision = confirmed.revision; entry.confirmedGeneration = generation;
          entry.state = entry.generation === generation ? 'saved' : 'pending'; this.error = ''; this.changed();
        } catch (error) {
          if (this.active && epoch === this.epoch) {
            entry.state = 'error'; this.error = (error as Error).message; this.changed();
          }
          throw error;
        }
      }
    };
    this.pending = work().finally(() => {
      this.pending = null;
      const deferred = this.deferred; this.deferred = null;
      if (deferred) this.receive(deferred.revision, deferred.answers);
      this.changed();
    });
    return this.pending;
  }

  invalidate() { this.active = false; this.epoch++; this.clock.clear(this.timer); }
  activate() { this.active = true; }
}
