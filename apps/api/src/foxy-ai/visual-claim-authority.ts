import { isDeepStrictEqual } from 'node:util';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyGroundingFile, FoxyGroundingSnapshot } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import type { createFoxyPrivateAssetAuthority } from './private-asset-authority.ts';
import type { FoxyVisualLease, VisualScope } from './visual-worker-types.ts';
import { checkVisualClaim } from './visual-claim-check.ts';
type State = { lease: FoxyVisualLease; snapshot: FoxyGroundingSnapshot; signal: AbortSignal; closed: boolean; assetScope: { capability: object } };
type Document = { state: State; file: FoxyGroundingFile; classroomId: string };
const denied = (): never => { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); };
export function createFoxyVisualClaimAuthority(options: { database: SqlDatabase; maxJobAgeMs: number; assets: ReturnType<typeof createFoxyPrivateAssetAuthority> }) {
  if (!Number.isSafeInteger(options.maxJobAgeMs) || options.maxJobAgeMs < 1) return denied();
  const claims = new WeakMap<object, State>(), docs = new WeakMap<object, Document>(), scopes = new WeakMap<object, State>();
  const transact = <T>(fn: (tx: SqlTransaction) => Promise<T>) => options.database.$transaction(raw => fn({ query: (sql,...args) => raw.$queryRawUnsafe(sql,...args) }),{ maxWait: 2000, timeout: 6000 });
  function state(capability: object, signal: AbortSignal): State { const found = capability && claims.get(capability); if (!found || found.closed || signal !== found.signal || signal.aborted) return denied(); return found; }
  async function verify(s: State, signal: AbortSignal, tx?: SqlTransaction): Promise<boolean> {
    if (s.closed || s.signal !== signal || signal.aborted) return denied();
    const result = tx ? await checkVisualClaim(tx,s.lease,options.maxJobAgeMs) : await transact(active => checkVisualClaim(active,s.lease,options.maxJobAgeMs));
    if (s.closed || signal.aborted) return denied(); return result.fresh && isDeepStrictEqual(result.snapshot,s.snapshot);
  }
  return {
    async open(input: FoxyVisualLease, signal: AbortSignal): Promise<VisualScope> {
      signal.throwIfAborted(); const lease = structuredClone(input);
      const found = await transact(async tx => {
        const status = await checkVisualClaim(tx,lease,options.maxJobAgeMs); if (!status.fresh) return denied();
        const [job] = await tx.query<{ id: string; asset_id: string; kind: 'IMAGE'|'DIAGRAM'; prompt: string; aspect_ratio: VisualScope['job']['aspectRatio']; profile: VisualScope['job']['profile']; dispatch_count: number }>('SELECT id,asset_id,kind,prompt,aspect_ratio,profile,dispatch_count FROM foxy_visual_jobs WHERE id=$1::uuid',lease.jobId);
        if (!job) return denied(); return { status,job };
      });
      const assetScope = await options.assets.open(lease,signal);
      const s: State = { lease, snapshot: structuredClone(found.status.snapshot), signal, closed: false, assetScope };
      try { if (!await verify(s,signal)) return denied(); } catch (error) { options.assets.close(assetScope); throw error; }
      const capability = Object.freeze({}), documents: VisualScope['documents'] = []; claims.set(capability,s);
      if (s.snapshot.context.kind === 'CLASSROOM') for (const source of s.snapshot.sources) for (const file of source.files) {
        const doc = Object.freeze({}), classroomId = s.snapshot.context.classroomId; docs.set(doc,{ state: s, file: structuredClone(file), classroomId });
        documents.push({ capability: doc, descriptor: { classroomId, file: structuredClone(file) } });
      }
      const j = found.job, scope: VisualScope = { capability, assetCapability: assetScope.capability, snapshot: structuredClone(s.snapshot), documents,
        job: { id: j.id, assetId: j.asset_id, kind: j.kind, prompt: j.prompt, aspectRatio: j.aspect_ratio, profile: structuredClone(j.profile), dispatchCount: j.dispatch_count } };
      scopes.set(scope,s); return scope;
    },
    async revalidateGrounding(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const s = state(capability,signal);
      if (tx) {
        await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)');
        await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
        await tx.query('SELECT id FROM users WHERE id=$1::uuid FOR SHARE',s.lease.ownerId);
        if (s.snapshot.context.kind === 'CLASSROOM') await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR SHARE',s.snapshot.context.classroomId);
        await tx.query('SELECT id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid FOR SHARE',s.lease.conversationId,s.lease.ownerId);
      }
      return verify(s,signal,tx);
    },
    async authorizeClaim(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const s = state(capability,signal); if (!await verify(s,signal,tx)) return denied(); return { ...s.lease, snapshot: structuredClone(s.snapshot) };
    },
    async authorizeDocument(capability: object, signal: AbortSignal, tx?: SqlTransaction) {
      const doc = capability && docs.get(capability); if (!doc || !await verify(doc.state,signal,tx)) return denied();
      return { ...doc.state.lease, classroomId: doc.classroomId, file: structuredClone(doc.file) };
    },
    close(scope: VisualScope) { const s = scope && scopes.get(scope); if (s) { s.closed = true; options.assets.close(s.assetScope); } },
  };
}
