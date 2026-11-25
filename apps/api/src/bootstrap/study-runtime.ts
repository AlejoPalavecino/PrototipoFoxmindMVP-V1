import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiConfiguration } from './configuration.ts';
import type { PrismaService } from '../platform/database/prisma.service.ts';
import type { IdentityRuntime } from './identity-runtime.ts';
import type { FileService } from '../modules/files/custody/infrastructure/service.ts';
import type { AiRuntimeOverride } from './academic-curriculum-ai-runtime.ts';
import { createStudyService } from './study-composition.ts';
import { createStudyAuthentication } from './study-transport.ts';
import { createStudyFileIntegration } from './study-file-integration.ts';
import { createFoxyAuthentication } from './foxy-host.ts';
import { inspectContent } from '../modules/files/custody/infrastructure/content.ts';
import { createChatAttachmentService } from '../modules/files/custody/infrastructure/chat-attachment-service.ts';
import { createStudyAgendaIntegration } from './study-agenda-integration.ts';
import { createStudyReminderRuntime } from '../modules/study/reviews/infrastructure/runtime.ts';
import { executeStudy, generateDevelopmentFeedback } from '../../../../src/core/domain/study/engine.ts';
import type { StudyProvider } from '../../../../src/core/domain/study/engine.ts';
import { createGeminiStudyProvider } from '../modules/study/generation/infrastructure/providers/study-adapter.ts';
import { createStudyChatPreviews } from '../modules/study/generation/infrastructure/study-chat-previews.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { createStudyImages } from './study-images.ts';
import type { VisualProviders } from '../modules/foxy/visuals/application/visual-runtime-contracts.ts';

export const STUDY_RUNTIME = 'StudyRuntime';
export interface StudyRuntimeOptions {
  readonly study?: { provider: StudyProvider };
  readonly studyImageProvider?: VisualProviders['IMAGE'];
  readonly ai?: AiRuntimeOverride;
}

export function createStudyRuntime(database: PrismaService, identity: IdentityRuntime, files: FileService,
  configuration: ApiConfiguration, options: StudyRuntimeOptions) {
  const authenticate = createStudyAuthentication(identity.configuration.security);
  const fileBridge = createStudyFileIntegration(files, { database, authenticate, quotaBytes: configuration.studyQuotaBytes });
  const attachments = createChatAttachmentService({ database, storage: files.storage, student: authenticate,
    teacher: createFoxyAuthentication(identity.configuration.security), folderQuota: configuration.studyQuotaBytes,
    inspect: inspectContent, scan: bytes => files.scanner.scan(bytes) });
  const provider = (context: { ownerId: string; requestId: string; authorize?: () => Promise<void> } | undefined,
    flow: 'chat' | 'tool' | 'feedback', preview?: (markdown: string | undefined) => void) => {
    if (options.study) return {
      async generate(input: Parameters<StudyProvider['generate']>[0]) {
        await context?.authorize?.();
        return options.study!.provider.generate(input);
      },
    };
    if (options.ai !== undefined || !configuration.ai || !context) {
      throw Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' });
    }
    return createGeminiStudyProvider(configuration.ai, database, context.ownerId, context.requestId, context.authorize, undefined,
      { waitForAdmission: flow === 'feedback', flow, ...(preview ? { preview } : {}) });
  };
  const chatPreviews = createStudyChatPreviews();
  const images = createStudyImages(database, files.scanner, configuration, {
    enabled: options.ai !== undefined || options.study !== undefined || Object.hasOwn(options, 'studyImageProvider'),
    provider: options.studyImageProvider,
  });
  const service = createStudyService({ database, authenticate, images, files: fileBridge.port, agenda: createStudyAgendaIntegration(),
    // Provider construction stays synchronous so an unavailable AI still throws before any work starts.
    generate: (input, context) => {
      const session = input.action === 'CHAT' && context?.folderId ? chatPreviews.open(context.ownerId, context.folderId, context.requestId) : undefined;
      let selected: ReturnType<typeof provider>;
      try { selected = provider(context, input.action === 'CHAT' ? 'chat' : 'tool', session?.publish); }
      catch (error) { session?.close(); throw error; }
      return executeStudy(input, selected).finally(() => session?.close());
    },
    chatPreview: (ownerId, folderId, requestId) => chatPreviews.read(ownerId, folderId, requestId),
    feedback: (input, context) => generateDevelopmentFeedback(input.practice, input.answers, input.sources,
      provider(context, 'feedback'), input.history) });
  const reminders = createStudyReminderRuntime({ database, authenticate });
  const admit = async (request: IncomingMessage, response: ServerResponse) => {
    void response;
    const cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await identity.store.authenticate(cookie.verifier) : null;
    const ip = identity.configuration.security.clientAddress(request);
    if (!ip) throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
    await identity.generalAdmission(ip, context);
  };
  let cleanup: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (!cleanup) cleanup = attachments.cleanup()
      .catch(() => console.warn('Chat attachment cleanup unavailable'))
      .finally(() => { cleanup = undefined; });
  }, 60000);
  timer.unref();
  return { service, uploads: fileBridge.uploads, reminders, admit, attachments,
    async close() {
      clearInterval(timer);
      await Promise.all([reminders.close(), cleanup]);
    },
  };
}
