import { createFoxyCreationRepository } from '../modules/foxy/infrastructure/creation-repository.ts';
import { createFoxyCreationService } from '../modules/foxy/application/creation-service.ts';
import type { SqlDatabase } from '../../../../src/core/contracts/sql.ts';
import type { FoxyFileOperations } from '../modules/foxy/infrastructure/file-operations.ts';
import { createFoxyUnitOfWork } from '../modules/foxy/infrastructure/unit-of-work.ts';
import { createFoxyPrivateAssetEditorialRepository } from '../modules/foxy/infrastructure/private-asset-editorial-repository.ts';
import { createFoxyPrivateAssetEditorialService } from '../modules/foxy/application/private-asset-editorial-service.ts';
import { createFoxyPrivateAssetReadRepository } from '../modules/foxy/infrastructure/private-asset-read-repository.ts';
import { createFoxyVisualPublicationRepository } from '../modules/foxy/infrastructure/visual-publication-repository.ts';
import { createFoxyPrivateAssetReadService } from '../modules/foxy/application/private-asset-read-service.ts';
import { createFoxyPrivateAssetReader } from '../modules/foxy/infrastructure/private-asset-reader.ts';
import { createFoxyConversationRepository } from '../modules/foxy/infrastructure/conversation-repository.ts';
import { createFoxyTurnRepository } from '../modules/foxy/infrastructure/turn-repository.ts';
import { createFoxyConversationService } from './foxy-service-factories.ts';
import { createFoxyTurnService } from './foxy-service-factories.ts';
import { FoxyContextCatalogService } from '../modules/foxy/infrastructure/context-catalog.ts';
import { createFoxyCitationService } from './foxy-service-factories.ts';
import { createFoxyClaimAuthority } from '../modules/foxy/infrastructure/claim-authority.ts';
import { createFoxyDurableLoader } from '../modules/foxy/infrastructure/durable-loader.ts';
import { createFoxyTurnQueue } from '../modules/foxy/infrastructure/turn-queue.ts';
import { createFoxyTextBudget } from '../modules/foxy/infrastructure/text-budget.ts';
import { createFoxyTurnCompletion } from '../modules/foxy/infrastructure/turn-completion.ts';
import { createFoxyClaimedTurnReader } from '../modules/foxy/infrastructure/turn-claimed-reader.ts';
import { createFoxyTextWorker } from '../modules/foxy/infrastructure/worker.ts';
import { createFoxyTurnRecovery } from '../modules/foxy/infrastructure/turn-recovery.ts';
import { createFoxyResourceRepository } from '../modules/foxy/infrastructure/resource-repository.ts';
import { createFoxyResourceService } from './foxy-service-factories.ts';
import { createFoxyPublicationRepository } from '../modules/foxy/infrastructure/publication-repository.ts';
import { createFoxyPublicationConfirmationRepository } from '../modules/foxy/infrastructure/publication-confirmation-repository.ts';
import { createFoxyPublicationService } from '../modules/foxy/application/publication-service.ts';
import { createFoxyPublicationManagementService } from '../modules/foxy/application/publication-management-service.ts';
import { createFoxyPublicationManagementRepository } from '../modules/foxy/infrastructure/publication-management-repository.ts';
import { createFoxyPublicationFileReader } from '../modules/foxy/infrastructure/publication-file-reader.ts';
import { createFoxyPublicationQueue } from '../modules/foxy/infrastructure/publication-queue.ts';
import { createFoxyPublicationAuthority } from '../modules/foxy/infrastructure/publication-authority.ts';
import { createFoxyPublicationCompletion } from '../modules/foxy/infrastructure/publication-completion.ts';
import { createFoxyPublicationWorker } from '../modules/foxy/infrastructure/publication-worker.ts';
import { createFoxyPdfRenderer } from '../modules/foxy/infrastructure/pdf-worker.ts';
import { createFoxyPublicationCleanup } from '../modules/foxy/infrastructure/publication-cleanup.ts';
import { createFoxyVisualRuntime, type VisualConfiguration, type VisualProviders, type VisualBudgetLimits } from './foxy-visual-runtime.ts';

export const FOXY_RUNTIME = Symbol('FOXY_RUNTIME');

type Configuration = Parameters<typeof createFoxyTurnQueue>[0]['configuration'] & { model: string; maxInputTokens: number };
type Provider = Parameters<typeof createFoxyTextWorker>[0]['provider'];
type Options = { database: SqlDatabase; authenticate: Parameters<typeof createFoxyUnitOfWork>[0]['authenticate'];
  classrooms: ConstructorParameters<typeof FoxyContextCatalogService>[0]; fileOperations: FoxyFileOperations;
  configuration: Configuration | null; provider: Provider | null; storage: { remove(key: string): Promise<void> };
  visualConfiguration?: VisualConfiguration | null; visualProviders?: VisualProviders | null; visualBudgetLimits?: VisualBudgetLimits | null };
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
  const documents = { read: (capability: object, signal: AbortSignal) =>
    options.fileOperations.documents(authority.authorizeDocument).read(capability, signal) };
  const budget = createFoxyTextBudget({ configuration });
  return createFoxyTextWorker({ database: options.database, configuration, provider, authority,
    queue: createFoxyTurnQueue({ database: options.database, configuration }),
    turns: createFoxyClaimedTurnReader({ database: options.database, maxJobAgeMs: configuration.maxJobAgeMs }),
    loader: createFoxyDurableLoader({ authority, documents, readAttachment: options.fileOperations.attachments?.read }), budget,
    completion: createFoxyTurnCompletion({ database: options.database, budget, configuration }) });
}
function publicationWorkerFor(options: Options) {
  const authority = createFoxyPublicationAuthority({ database: options.database });
  const { publicationFiles, publicationRaster } = options.fileOperations;
  return createFoxyPublicationWorker({ queue: createFoxyPublicationQueue({ database: options.database }), authority,
    files: publicationFiles(authority), renderer: createFoxyPdfRenderer(),
    rasterSource: { read: (capability, signal) => publicationRaster(authority).read(capability, signal) },
    completion: createFoxyPublicationCompletion({ database: options.database }) });
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
  const visual = options.visualConfiguration && options.visualProviders && options.visualBudgetLimits
    ? createFoxyVisualRuntime({ database: options.database, fileOperations: options.fileOperations, uow, conversations, configuration: options.visualConfiguration,
      providers: options.visualProviders, limits: options.visualBudgetLimits }) : null;
  const enabled = valid(options.configuration, options.provider);
  const worker = enabled ? workerFor(options, options.configuration!, options.provider!) : null;
  const lifecycle = worker ?? maintenance(options.database), publicationWorker = publicationWorkerFor(options);
  const assets = createFoxyPrivateAssetReadRepository();
  const privateAssetReader = options.fileOperations.readPrivateAsset
    ? createFoxyPrivateAssetReader({ uow, assets, storage: { get: options.fileOperations.readPrivateAsset } }) : undefined;
  const services = { privateAssetEditorial: createFoxyPrivateAssetEditorialService({ uow, assets: createFoxyPrivateAssetEditorialRepository(), reads: assets }), creations: createFoxyCreationService({ uow, creations: createFoxyCreationRepository() }), visuals: visual?.service, privateAssetReader, privateAssetReadService: createFoxyPrivateAssetReadService({ uow, assets }), conversations: createFoxyConversationService({ uow, conversations }),
    turns: createFoxyTurnService({ uow, conversations, turns, attachments: options.fileOperations.attachments?.list, wakeWorker: worker?.wake,
      configuration: { enabled, model: enabled ? options.configuration!.model : '' } }),
    catalog: new FoxyContextCatalogService(options.classrooms, conversations),
    citations: createFoxyCitationService({ uow, files: { read: options.fileOperations.read } }),
    resources: createFoxyResourceService({ uow, resources: createFoxyResourceRepository() }),
    publicationFiles: createFoxyPublicationFileReader({ uow, files: { read: options.fileOperations.read } }),
    publicationManagement: createFoxyPublicationManagementService({ uow, management: createFoxyPublicationManagementRepository() }),
    publications: createFoxyPublicationService({ uow, publications: createFoxyPublicationRepository(), visualPublications: createFoxyVisualPublicationRepository({ assets }),
      confirmations: createFoxyPublicationConfirmationRepository({ library: { publish: options.fileOperations.publishMaterial } }) }),
    capabilities: (request: unknown) => uow.run(request, false, async () => ({ textGeneration: { enabled },
      imageGeneration: { enabled: visual?.gates.IMAGE ?? false }, diagramGeneration: { enabled: visual?.gates.DIAGRAM ?? false } })) };
  return { services, worker, publicationWorker, visualWorker: visual?.worker ?? null, onModuleInit: () => { lifecycle.onModuleInit(); publicationWorker.onModuleInit(); cleanup.onModuleInit(); visual?.worker.onModuleInit(); },
    onModuleDestroy: async () => {
      const results = await Promise.allSettled([...([lifecycle, publicationWorker, cleanup].map(item => Promise.resolve().then(() => item.onModuleDestroy()))), ...(visual ? [visual.close()] : [])]);
      const failure = results.find(result => result.status === 'rejected'); if (failure?.status === 'rejected') throw failure.reason;
    } };
}
