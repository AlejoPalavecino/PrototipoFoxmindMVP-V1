import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiConfiguration } from './configuration.ts';
import type { PrismaService } from '../platform/database/prisma.service.ts';
import type { IdentityRuntime } from './identity-runtime.ts';
import type { FileService } from '../modules/files/infrastructure/service.ts';
import type { AiRuntimeOverride } from './academic-curriculum-ai-runtime.ts';
import { createStudyService } from './study-composition.ts';
import { createStudyAuthentication } from './study-transport.ts';
import { createStudyFileIntegration } from './study-file-integration.ts';
import { createFoxyAuthentication } from './foxy-host.ts';
import { inspectContent } from '../modules/files/infrastructure/content.ts';
import { createChatAttachmentService } from '../modules/files/infrastructure/chat-attachment-service.ts';
import { createStudyAgendaIntegration } from './study-agenda-integration.ts';
import { createStudyReminderRuntime } from '../modules/study/infrastructure/folders/reminders/runtime.ts';
import { executeStudy, generateDevelopmentFeedback } from '../../../../src/core/domain/study/engine.ts';
import type { StudyInput, StudyProvider, StudyPractice, StudyAnswers } from '../../../../src/core/domain/study/engine.ts';
import { createGeminiStudyProvider } from '../modules/study/infrastructure/providers/study-adapter.ts';
import { readSessionCookie } from '../modules/identity/presentation/transport.ts';

export const STUDY_RUNTIME = 'StudyRuntime';
export interface StudyRuntimeOptions {
  readonly study?: { provider: StudyProvider };
  readonly ai?: AiRuntimeOverride;
}

export function createStudyRuntime(database: PrismaService, identity: IdentityRuntime, files: FileService,
  configuration: ApiConfiguration, options: StudyRuntimeOptions) {
  const authenticate = createStudyAuthentication(identity.configuration.security);
  const fileBridge = createStudyFileIntegration(files, { database, authenticate, quotaBytes: configuration.studyQuotaBytes });
  const attachments = createChatAttachmentService({ database, storage: files.storage, student: authenticate,
    teacher: createFoxyAuthentication(identity.configuration.security), folderQuota: configuration.studyQuotaBytes,
    inspect: inspectContent, scan: bytes => files.scanner.scan(bytes) });
  const provider = (context?: { ownerId: string; requestId: string; authorize?: () => Promise<void> }) => {
    if (options.study) return {
      async generate(input: Parameters<StudyProvider['generate']>[0]) {
        await context?.authorize?.();
        return options.study!.provider.generate(input);
      },
    };
    if (options.ai !== undefined || !configuration.ai || !context) {
      throw Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' });
    }
    return createGeminiStudyProvider(configuration.ai, database, context.ownerId, context.requestId, context.authorize);
  };
  const service = createStudyService({ database, authenticate, files: fileBridge.port, agenda: createStudyAgendaIntegration(),
    generate: (input, context) => executeStudy(input as StudyInput, provider(context)),
    feedback: (input, context) => generateDevelopmentFeedback(input.practice as StudyPractice, input.answers as StudyAnswers, input.sources, provider(context)) });
  const reminders = createStudyReminderRuntime({ database, authenticate });
  const admit = async (request: IncomingMessage, response: ServerResponse) => {
    void response;
    const cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await identity.store.authenticate(cookie.verifier) : null;
    if (!request.socket.remoteAddress) throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
    await identity.generalAdmission(request.socket.remoteAddress, context);
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
