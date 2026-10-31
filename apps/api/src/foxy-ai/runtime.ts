import type { SqlDatabase } from '../../../../src/core/domain/index.ts';
import type { FileService } from '../files/index.ts';
import { createFoxyUnitOfWork } from './unit-of-work.ts';
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

type Configuration = Parameters<typeof createFoxyTurnQueue>[0]['configuration'] & { model: string; maxInputTokens: number };
type Provider = Parameters<typeof createFoxyTextWorker>[0]['provider'];
type Options = { database: SqlDatabase; authenticate: Parameters<typeof createFoxyUnitOfWork>[0]['authenticate'];
  classrooms: ConstructorParameters<typeof FoxyContextCatalogService>[0]; files: FileService;
  configuration: Configuration | null; provider: Provider | null };
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
  const uow = createFoxyUnitOfWork(options), conversations = createFoxyConversationRepository(), turns = createFoxyTurnRepository();
  const enabled = valid(options.configuration, options.provider);
  const worker = enabled ? workerFor(options, options.configuration!, options.provider!) : null;
  const lifecycle = worker ?? maintenance(options.database);
  const services = { conversations: createFoxyConversationService({ uow, conversations }),
    turns: createFoxyTurnService({ uow, conversations, turns, configuration: { enabled, model: enabled ? options.configuration!.model : '' } }),
    catalog: new FoxyContextCatalogService(options.classrooms, conversations),
    citations: createFoxyCitationService({ uow, files: options.files }),
    capabilities: (request: unknown) => uow.run(request, false, async () => ({ textGeneration: { enabled },
      imageGeneration: { enabled: false }, diagramGeneration: { enabled: false } })) };
  return { services, worker, onModuleInit: () => lifecycle.onModuleInit(),
    onModuleDestroy: async () => { await lifecycle.onModuleDestroy(); } };
}
