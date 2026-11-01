import type { SqlDatabase } from '../../../../src/core/domain/index.ts';
import type { FileService } from '../files/index.ts';
import { createFoxyUnitOfWork } from './unit-of-work.ts';
import { createFoxyPrivateAssetReadRepository } from './private-asset-read-repository.ts';
import { createFoxyPrivateAssetReadService } from './private-asset-read-service.ts';
import { createFoxyPrivateAssetReader } from './private-asset-reader.ts';
import { createFoxyConversationRepository } from './conversation-repository.ts';
import { createFoxyTurnRepository } from './turn-repository.ts';
import { createFoxyConversationService } from './conversation-service.ts';
import { createFoxyTurnService } from './turn-service.ts';
import { FoxyContextCatalogService } from './context-catalog.ts';
import { createFoxyCitationService } from './citation-service.ts';
import { createFoxyClaimAuthority } from './claim-authority.ts';
import { createFoxyDurableLoader } from './durable-loader.ts';
import { createFoxyTurnQueue } from './turn-queue.ts';
import { createFoxyTextBudget } from './text-budget.ts';
import { createFoxyTurnCompletion } from './turn-completion.ts';
import { createFoxyClaimedTurnReader } from './turn-claimed-reader.ts';
import { createFoxyTextWorker } from './worker.ts';
import { createFoxyTurnRecovery } from './turn-recovery.ts';
import { createFoxyResourceRepository } from './resource-repository.ts';
import { createFoxyResourceService } from './resource-service.ts';
import { createFoxyPublicationRepository } from './publication-repository.ts';
import { createFoxyPublicationConfirmationRepository } from './publication-confirmation-repository.ts';
import { createFoxyPublicationService } from './publication-service.ts';
import { createFoxyPublicationManagementService } from './publication-management-service.ts';
import { createFoxyPublicationManagementRepository } from './publication-management-repository.ts';
import { createFoxyPublicationFileReader } from './publication-file-reader.ts';
import { createLibraryMaterialPublisher } from '../classrooms/public/index.ts';
import { createFoxyPublicationQueue } from './publication-queue.ts';
import { createFoxyPublicationAuthority } from './publication-authority.ts';
import { createFoxyPublicationCompletion } from './publication-completion.ts';
import { createFoxyPublicationWorker } from './publication-worker.ts';
import { createFoxyPdfRenderer } from './pdf-worker.ts';
import { createFoxyPublicationCleanup } from './publication-cleanup.ts';
import type { createDurableFoxyPublicationFiles } from '../files/index.ts';

export const FOXY_RUNTIME = Symbol('FOXY_RUNTIME');

type Configuration = Parameters<typeof createFoxyTurnQueue>[0]['configuration'] & { model: string; maxInputTokens: number };
type Provider = Parameters<typeof createFoxyTextWorker>[0]['provider'];
type Options = { database: SqlDatabase; authenticate: Parameters<typeof createFoxyUnitOfWork>[0]['authenticate'];
  classrooms: ConstructorParameters<typeof FoxyContextCatalogService>[0]; files: FileService;
  configuration: Configuration | null; provider: Provider | null; storage: { remove(key: string): Promise<void> } };
function valid(config: Configuration | null, provider: Provider | null): config is Configuration {
  if (!config || !provider || typeof provider.countTokens !== 'function' || typeof provider.generate !== 'function'
    || typeof config.model !== 'string' || (!config.model.trim() || config.model.length > 200 || /[\u0000-\u001f\u007f]/u.test(config.model))) return false;
  const integers = [config.maxInputTokens, config.maxOutputTokens, config.maxConcurrency, config.deadlineMs,
    config.maxJobAgeMs, config.dailyActorRequests, config.dailyGlobalRequests];
  const amounts = [config.inputUsdPerMillion, config.outputUsdPerMillion, config.dailyBudgetUsd];
  return integers.every(value => Number.isSafeInteger(value) && value > 0)
    && amounts.every(value => Number.isFinite(value) && value > 0);
}
function workerFor(options: Options, configuration: Configuration, provider: Provider) {
  const authority = createFoxyClaimAuthority({ database: options.database, maxJobAgeMs: configuration.maxJobAgeMs });
  const documents = { read: async (capability: object, signal: AbortSignal) => {
    const { createDurableFoxyDocumentReader } = await import('../files/index.ts');
    return createDurableFoxyDocumentReader({ files: options.files, authorizeDocument: authority.authorizeDocument }).read(capability, signal);
  } };
  const budget = createFoxyTextBudget({ configuration });
  return createFoxyTextWorker({ database: options.database, configuration, provider, authority,
    queue: createFoxyTurnQueue({ database: options.database, configuration }),
    turns: createFoxyClaimedTurnReader({ database: options.database, maxJobAgeMs: configuration.maxJobAgeMs }),
    loader: createFoxyDurableLoader({ authority, documents }), budget,
    completion: createFoxyTurnCompletion({ database: options.database, budget, configuration }) });
}
function publicationWorkerFor(options: Options) {
  const authority = createFoxyPublicationAuthority({ database: options.database });
  type Bridge = ReturnType<typeof createDurableFoxyPublicationFiles>;
  let bridge: Promise<Bridge> | undefined;
  const get = () => bridge ??= import('../files/index.ts').then(({ createDurableFoxyPublicationFiles }) =>
    createDurableFoxyPublicationFiles({ files: options.files, authority }));
  const files: Bridge = {
    ensureFile: async (...args: Parameters<Bridge['ensureFile']>) => (await get()).ensureFile(...args),
    inspect: async (...args: Parameters<Bridge['inspect']>) => (await get()).inspect(...args),
    receive: async (...args: Parameters<Bridge['receive']>) => (await get()).receive(...args),
    proof: async (...args: Parameters<Bridge['proof']>) => (await get()).proof(...args),
  };
  return createFoxyPublicationWorker({ queue: createFoxyPublicationQueue({ database: options.database }), authority, files,
    renderer: createFoxyPdfRenderer(), completion: createFoxyPublicationCompletion({ database: options.database }) });
}
function maintenance(database: SqlDatabase) {
  const recovery = createFoxyTurnRecovery({ database });
  let initialized = false, stopped = false, timer: ReturnType<typeof setTimeout> | undefined, active: Promise<unknown> | undefined;
  function poll(): void {
    if (stopped) return;
    timer = setTimeout(() => { timer = undefined; active = recovery.recoverExpired().catch(() => undefined).finally(() => { active = undefined; poll(); }); }, 30000);
    timer.unref?.();
  }
  return { onModuleInit() { if (!initialized && !stopped) { initialized = true; poll(); } },
    async onModuleDestroy() { stopped = true; if (timer) clearTimeout(timer); await active; } };
}
export function createFoxyRuntime(options: Options) {
  if (!options.storage || typeof options.storage.remove !== 'function') throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
  const cleanup = createFoxyPublicationCleanup({ database: options.database, storage: options.storage, onError: () => console.warn('Foxy publication cleanup unavailable') });
  const uow = createFoxyUnitOfWork(options), conversations = createFoxyConversationRepository(), turns = createFoxyTurnRepository();
  const enabled = valid(options.configuration, options.provider);
  const worker = enabled ? workerFor(options, options.configuration!, options.provider!) : null;
  const lifecycle = worker ?? maintenance(options.database), publicationWorker = publicationWorkerFor(options);
  const assets = createFoxyPrivateAssetReadRepository();
  const privateAssetReader = options.files.storage && typeof options.files.storage.get === 'function'
    ? createFoxyPrivateAssetReader({ uow, assets, storage: options.files.storage }) : undefined;
  const services = { privateAssetReader, privateAssetReadService: createFoxyPrivateAssetReadService({ uow, assets }), conversations: createFoxyConversationService({ uow, conversations }),
    turns: createFoxyTurnService({ uow, conversations, turns, configuration: { enabled, model: enabled ? options.configuration!.model : '' } }),
    catalog: new FoxyContextCatalogService(options.classrooms, conversations),
    citations: createFoxyCitationService({ uow, files: options.files }),
    resources: createFoxyResourceService({ uow, resources: createFoxyResourceRepository() }),
    publicationFiles: createFoxyPublicationFileReader({ uow, files: options.files }),
    publicationManagement: createFoxyPublicationManagementService({ uow, management: createFoxyPublicationManagementRepository() }),
    publications: createFoxyPublicationService({ uow, publications: createFoxyPublicationRepository(),
      confirmations: createFoxyPublicationConfirmationRepository({ library: createLibraryMaterialPublisher({ files: options.files.store }) }) }),
    capabilities: (request: unknown) => uow.run(request, false, async () => ({ textGeneration: { enabled },
      imageGeneration: { enabled: false }, diagramGeneration: { enabled: false } })) };
  return { services, worker, publicationWorker, onModuleInit: () => { lifecycle.onModuleInit(); publicationWorker.onModuleInit(); cleanup.onModuleInit(); },
    onModuleDestroy: async () => {
      const results = await Promise.allSettled([lifecycle, publicationWorker, cleanup].map(item => Promise.resolve().then(() => item.onModuleDestroy())));
      const failure = results.find(result => result.status === 'rejected'); if (failure?.status === 'rejected') throw failure.reason;
    } };
}
