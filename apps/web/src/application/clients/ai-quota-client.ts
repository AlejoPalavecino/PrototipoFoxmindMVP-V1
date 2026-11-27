import { aiQuotaEventsPath, aiQuotaPath, type AiQuotaSnapshot } from '../../../../../src/core/contracts/ai-quota.ts';

export interface AiQuotaState {
  snapshot: AiQuotaSnapshot | null;
  connected: boolean;
  unavailable?: true;
}

function isSnapshot(value: unknown): value is AiQuotaSnapshot {
  if (!value || typeof value !== 'object') return false;
  const quota = value as AiQuotaSnapshot;
  return [quota.version, quota.limitMicrousd, quota.consumedMicrousd, quota.reservedMicrousd, quota.remainingMicrousd]
    .every(value => Number.isSafeInteger(value) && value >= 0)
    && typeof quota.subjectId === 'string'
    && typeof quota.periodStart === 'string' && Number.isFinite(Date.parse(quota.periodStart))
    && typeof quota.renewsAt === 'string' && Number.isFinite(Date.parse(quota.renewsAt))
    && Array.isArray(quota.tools) && quota.tools.every(tool => tool && typeof tool.capability === 'string'
      && [tool.consumedMicrousd, tool.reservedMicrousd, tool.chargedOperations, tool.reservedOperations]
        .every(value => Number.isSafeInteger(value) && value >= 0));
}

const retryMs = 5000;

export function subscribeAiQuota(subjectId: string, update: (state: AiQuotaState) => void, browser = window): () => void {
  let state: AiQuotaState = { snapshot: null, connected: false };
  let stream: EventSource | undefined;
  let timer: number | undefined;
  let checking = false;
  const lifetime = new AbortController();

  function publish(snapshot: AiQuotaSnapshot | null, connected: boolean) {
    if (snapshot && snapshot.subjectId !== subjectId) return unavailable();
    const previous = state.snapshot;
    if (snapshot && previous) {
      if (snapshot.periodStart < previous.periodStart
        || snapshot.periodStart === previous.periodStart && snapshot.version <= previous.version) snapshot = previous;
    }
    if (state.snapshot === snapshot && state.connected === connected) return;
    state = { snapshot, connected };
    update(state);
  }

  function unavailable() {
    stop();
    state = { snapshot: null, connected: false, unavailable: true };
    update(state);
  }

  function schedule(ms = retryMs) {
    if (timer === undefined && !checking && !state.connected && !lifetime.signal.aborted) {
      timer = browser.setTimeout(checkSnapshot, ms);
    }
  }
  async function checkSnapshot() {
    timer = undefined;
    if (state.connected || lifetime.signal.aborted) return;
    checking = true;
    try {
      const response = await browser.fetch(aiQuotaPath, {
        cache: 'no-store', credentials: 'same-origin', signal: lifetime.signal,
      });
      if (state.connected || lifetime.signal.aborted) return;
      if (response.status === 401 || response.status === 403) {
        unavailable();
        return;
      }
      if (response.ok) {
        const snapshot: unknown = await response.json();
        if (!state.connected && !lifetime.signal.aborted && isSnapshot(snapshot)) publish(snapshot, false);
        if (!lifetime.signal.aborted && stream && stream.readyState === browser.EventSource.CLOSED) connect();
      }
    } catch { /* Retain the last authorized snapshot for a transient connection loss. */ }
    finally { checking = false; schedule(); }
  }

  function connect() {
    stream = new browser.EventSource(aiQuotaEventsPath);
    stream.onmessage = event => {
      if (lifetime.signal.aborted) return;
      try {
        const snapshot: unknown = JSON.parse(event.data);
        if (!isSnapshot(snapshot) || event.lastEventId !== String(snapshot.version)) return;
        if (timer !== undefined) browser.clearTimeout(timer);
        timer = undefined;
        publish(snapshot, true);
      } catch { /* A malformed response cannot replace the last valid snapshot. */ }
    };
    stream.onerror = () => {
      if (lifetime.signal.aborted) return;
      publish(state.snapshot, false);
      schedule();
    };
  }

  function stop() {
    lifetime.abort();
    stream?.close();
    if (timer !== undefined) browser.clearTimeout(timer);
  }

  if (browser.EventSource) connect();
  schedule(browser.EventSource ? retryMs : 0);
  return stop;
}
