import type { SqlDatabase } from '../../../../src/core/contracts/sql.ts';
import type { FoxyFileOperations } from '../modules/foxy/infrastructure/file-operations.ts';
import { createFoxyUnitOfWork } from '../modules/foxy/infrastructure/unit-of-work.ts';
import { createFoxyConversationRepository } from '../modules/foxy/infrastructure/conversation-repository.ts';
import { createFoxyPrivateAssetRepository } from '../modules/foxy/infrastructure/private-asset-repository.ts';
import { createFoxyPrivateAssetAuthority } from '../modules/foxy/infrastructure/private-asset-authority.ts';
import { createFoxyVisualClaimAuthority } from '../modules/foxy/infrastructure/visual-claim-authority.ts';
import { createFoxyDurableLoader } from '../modules/foxy/infrastructure/durable-loader.ts';
import { createFoxyVisualRepository, validateVisualProfile, type VisualProfile } from '../modules/foxy/infrastructure/visual-repository.ts';
import { createFoxyVisualService } from './foxy-service-factories.ts';
import { createFoxyVisualBudget } from '../modules/foxy/infrastructure/visual-budget.ts';
import { createFoxyVisualQueue } from '../modules/foxy/infrastructure/visual-queue.ts';
import { createFoxyVisualCompletion } from '../modules/foxy/infrastructure/visual-completion.ts';
import { createFoxyVisualWorker } from '../modules/foxy/infrastructure/visual-worker.ts';
import { createFoxyDiagramRenderer } from '../modules/foxy/infrastructure/diagram-renderer.ts';
import type { FoxyVisualLease, VisualOptions } from '../modules/foxy/infrastructure/visual-worker-types.ts';
import type { VisualConfiguration, VisualProviders, VisualBudgetLimits } from '../modules/foxy/application/visual-runtime-contracts.ts';
export type { VisualConfiguration, VisualProviders, VisualBudgetLimits } from '../modules/foxy/application/visual-runtime-contracts.ts';

type Options = { database: SqlDatabase; fileOperations: FoxyFileOperations; uow: ReturnType<typeof createFoxyUnitOfWork>; conversations: ReturnType<typeof createFoxyConversationRepository>;
  configuration: VisualConfiguration; providers: VisualProviders; limits: VisualBudgetLimits };
const unavailable = () => Promise.reject(Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' }));
function enabled(config: VisualConfiguration, providers: VisualProviders) {
  const works = (kind: 'IMAGE'|'DIAGRAM') => { const provider = providers?.[kind]; if (!config.enabled?.[kind] || !provider || typeof provider.countTokens !== 'function' || typeof provider.generate !== 'function') return false;
    try { validateVisualProfile(config.profiles?.[kind] ?? null,kind); return true; } catch { return false; } };
  return { IMAGE: works('IMAGE'), DIAGRAM: works('DIAGRAM') };
}
export function createFoxyVisualRuntime(options: Options) {
  const { configuration: config, database, fileOperations, providers } = options, gates = enabled(config,providers);
  const effective = { ...config, enabled: gates }, budget = createFoxyVisualBudget({ limits: options.limits });
  const queue = createFoxyVisualQueue({ database, configuration: effective, budget });
  const assetAuthority = createFoxyPrivateAssetAuthority({ database, maxJobAgeMs: config.maxJobAgeMs });
  const authority = createFoxyVisualClaimAuthority({ database, maxJobAgeMs: config.maxJobAgeMs, assets: assetAuthority });
  const documents = fileOperations.documents(authority.authorizeDocument);
  const loader = createFoxyDurableLoader({ authority, documents });
  let activeLease: FoxyVisualLease | null = null;
  const ownedQueue = { ...queue, async claim() { const lease = await queue.claim(); activeLease = lease; return lease; } };
  const custody = fileOperations.visualCustody(assetAuthority, lease => {
    const current = activeLease; if (!current || current.assetId !== lease.assetId || current.ownerId !== lease.ownerId || current.conversationId !== lease.conversationId || current.leaseNonce !== lease.leaseNonce) return Promise.resolve(false);
    return queue.renew(current);
  });
  const worker = createFoxyVisualWorker({ database, queue: ownedQueue, authority, loader, custody, budget,
    providers: { IMAGE: providers.IMAGE ?? { countTokens: unavailable, generate: unavailable }, DIAGRAM: providers.DIAGRAM ?? { countTokens: unavailable, generate: unavailable } },
    renderer: createFoxyDiagramRenderer(), completion: createFoxyVisualCompletion({ database, budget, maxJobAgeMs: config.maxJobAgeMs }), configuration: effective });
  const jobs = createFoxyVisualRepository({ assets: createFoxyPrivateAssetRepository() });
  const service = createFoxyVisualService({ uow: options.uow, conversations: options.conversations, jobs, configuration: effective });
  return { worker, service, gates, async close() { try { await worker.onModuleDestroy(); } finally { await custody.close(); } } };
}
