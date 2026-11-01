import type { SqlDatabase } from '../../../../src/core/domain/index.ts';
import type { FileService } from '../files/index.ts';
import { createDurableFoxyDocumentReader, createFoxyPrivateAssetFiles, createFoxyPrivateImageInspector } from '../files/public/index.ts';
import { createFoxyUnitOfWork } from './unit-of-work.ts';
import { createFoxyConversationRepository } from './conversation-repository.ts';
import { createFoxyPrivateAssetRepository } from './private-asset-repository.ts';
import { createFoxyPrivateAssetAuthority } from './private-asset-authority.ts';
import { createFoxyVisualClaimAuthority } from './visual-claim-authority.ts';
import { createFoxyDurableLoader } from './durable-loader.ts';
import { createFoxyVisualRepository, validateVisualProfile, type VisualProfile } from './visual-repository.ts';
import { createFoxyVisualService } from './visual-service.ts';
import { createFoxyVisualBudget } from './visual-budget.ts';
import { createFoxyVisualQueue } from './visual-queue.ts';
import { createFoxyVisualCompletion } from './visual-completion.ts';
import { createFoxyVisualWorker } from './visual-worker.ts';
import { createFoxyDiagramRenderer } from './diagram-renderer.ts';
import type { FoxyVisualLease, VisualOptions } from './visual-worker-types.ts';
export type VisualConfiguration = { enabled: { IMAGE: boolean; DIAGRAM: boolean }; profiles: { IMAGE: VisualProfile | null; DIAGRAM: VisualProfile | null }; privateQuotaBytes: bigint; maxConcurrency: number; maxJobAgeMs: number; deadlineMs: number };
export type VisualProviders = { IMAGE: VisualOptions['providers']['IMAGE'] | null; DIAGRAM: VisualOptions['providers']['DIAGRAM'] | null };
export type VisualBudgetLimits = Parameters<typeof createFoxyVisualBudget>[0]['limits'];
type Options = { database: SqlDatabase; files: FileService; uow: ReturnType<typeof createFoxyUnitOfWork>; conversations: ReturnType<typeof createFoxyConversationRepository>;
  configuration: VisualConfiguration; providers: VisualProviders; limits: VisualBudgetLimits };
const unavailable = () => Promise.reject(Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' }));
function enabled(config: VisualConfiguration, providers: VisualProviders) {
  const works = (kind: 'IMAGE'|'DIAGRAM') => { const provider = providers?.[kind]; if (!config.enabled?.[kind] || !provider || typeof provider.countTokens !== 'function' || typeof provider.generate !== 'function') return false;
    try { validateVisualProfile(config.profiles?.[kind] ?? null,kind); return true; } catch { return false; } };
  return { IMAGE: works('IMAGE'), DIAGRAM: works('DIAGRAM') };
}
export function createFoxyVisualRuntime(options: Options) {
  const { configuration: config, database, files, providers } = options, gates = enabled(config,providers);
  const effective = { ...config, enabled: gates }, budget = createFoxyVisualBudget({ limits: options.limits });
  const queue = createFoxyVisualQueue({ database, configuration: effective, budget });
  const assetAuthority = createFoxyPrivateAssetAuthority({ database, maxJobAgeMs: config.maxJobAgeMs });
  const authority = createFoxyVisualClaimAuthority({ database, maxJobAgeMs: config.maxJobAgeMs, assets: assetAuthority });
  const documents = createDurableFoxyDocumentReader({ files, authorizeDocument: authority.authorizeDocument });
  const loader = createFoxyDurableLoader({ authority, documents });
  let activeLease: FoxyVisualLease | null = null;
  const ownedQueue = { ...queue, async claim() { const lease = await queue.claim(); activeLease = lease; return lease; } };
  const custody = createFoxyPrivateAssetFiles({ files, authority: assetAuthority, inspector: createFoxyPrivateImageInspector(), renew: lease => {
    const current = activeLease; if (!current || current.assetId !== lease.assetId || current.ownerId !== lease.ownerId || current.conversationId !== lease.conversationId || current.leaseNonce !== lease.leaseNonce) return Promise.resolve(false);
    return queue.renew(current);
  } });
  const worker = createFoxyVisualWorker({ database, queue: ownedQueue, authority, loader, custody, budget,
    providers: { IMAGE: providers.IMAGE ?? { countTokens: unavailable, generate: unavailable }, DIAGRAM: providers.DIAGRAM ?? { countTokens: unavailable, generate: unavailable } },
    renderer: createFoxyDiagramRenderer(), completion: createFoxyVisualCompletion({ database, budget, maxJobAgeMs: config.maxJobAgeMs }), configuration: effective });
  const jobs = createFoxyVisualRepository({ assets: createFoxyPrivateAssetRepository() });
  const service = createFoxyVisualService({ uow: options.uow, conversations: options.conversations, jobs, configuration: effective });
  return { worker, service, gates, async close() { try { await worker.onModuleDestroy(); } finally { await custody.close(); } } };
}
