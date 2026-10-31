import { isDeepStrictEqual } from 'node:util';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyGroundingFile, FoxyGroundingSnapshot } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import { checkClaim, checkClaimStatus, forbidden } from './claim-authority-check.ts';

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}
type State = { lease: FoxyTurnLease; snapshot: FoxyGroundingSnapshot; signal: AbortSignal; closed: boolean };
type DocumentGrant = { state: State; file: FoxyGroundingFile; classroomId: string };
export interface FoxyClaimScope { snapshot: FoxyGroundingSnapshot; capability: object;
  documents: { descriptor: { classroomId: string; file: FoxyGroundingFile }; capability: object }[] }
export function createFoxyClaimAuthority(options: { database: SqlDatabase; maxJobAgeMs: number }) {
  if (!options.database || !Number.isSafeInteger(options.maxJobAgeMs) || options.maxJobAgeMs <= 0) return forbidden();
  const claims = new WeakMap<object, State>(), documents = new WeakMap<object, DocumentGrant>(), scopes = new WeakMap<object, State>();
  const transact = <T>(fn: (tx: SqlTransaction) => Promise<T>): Promise<T> => options.database.$transaction(
    raw => fn({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
  async function verify(state: State, signal: AbortSignal, tx?: SqlTransaction): Promise<void> {
    if (state.closed || state.signal.aborted || signal.aborted || signal !== state.signal) return forbidden();
    const run = (active: SqlTransaction) => checkClaim(active, state.lease, options.maxJobAgeMs);
    const snapshot = tx ? await run(tx) : await transact(run);
    if (state.closed || state.signal.aborted || signal.aborted || !snapshot ||
      !isDeepStrictEqual(snapshot, state.snapshot)) return forbidden();
  }
  return {
    async open(lease: FoxyTurnLease, signal: AbortSignal): Promise<FoxyClaimScope> {
      if (signal.aborted) return forbidden();
      const copy = freezeDeep(structuredClone(lease)), snapshot = await transact(tx => checkClaim(tx, copy, options.maxJobAgeMs));
      if (signal.aborted) return forbidden();
      const state: State = { lease: copy, snapshot: freezeDeep(structuredClone(snapshot)), signal, closed: false };
      const capability = Object.freeze({}); claims.set(capability, state);
      const grants: FoxyClaimScope['documents'] = [];
      if (snapshot.context.kind === 'CLASSROOM') for (const source of snapshot.sources) for (const file of source.files) {
        const docCapability = Object.freeze({}), descriptor = { classroomId: snapshot.context.classroomId, file: structuredClone(file) };
        documents.set(docCapability, { state, file: structuredClone(file), classroomId: descriptor.classroomId });
        grants.push({ descriptor, capability: docCapability });
      }
      const scope = { snapshot: structuredClone(snapshot), capability, documents: grants }; scopes.set(scope, state); return scope;
    },
    async revalidateGrounding(capability: object, signal: AbortSignal, tx?: SqlTransaction): Promise<boolean> {
      const state = capability && claims.get(capability);
      if (!state || state.closed || state.signal.aborted || signal.aborted || signal !== state.signal) return forbidden();
      const run = (active: SqlTransaction) => checkClaimStatus(active, state.lease, options.maxJobAgeMs);
      const result = tx ? await run(tx) : await transact(run);
      if (state.closed || state.signal.aborted || signal.aborted) return forbidden();
      return result.fresh && isDeepStrictEqual(result.snapshot, state.snapshot);
    },
    async authorizeClaim(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const state = capability && claims.get(capability); if (!state) return forbidden();
      await verify(state, signal, tx);
      return { ...state.lease, snapshot: structuredClone(state.snapshot) };
    },
    async authorizeDocument(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const grant = capability && documents.get(capability); if (!grant) return forbidden();
      await verify(grant.state, signal, tx);
      return { ...grant.state.lease, classroomId: grant.classroomId, file: structuredClone(grant.file) };
    },
    close(scope: FoxyClaimScope): void { const state = scope && scopes.get(scope); if (state) state.closed = true; },
  };
}
