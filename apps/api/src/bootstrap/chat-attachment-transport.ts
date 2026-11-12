import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { createChatAttachmentService } from '../modules/files/infrastructure/chat-attachment-service.ts';
import { attachmentError, CHAT_ATTACHMENT_BYTES, parseChatAttachmentIntent } from '../modules/files/infrastructure/chat-attachment-policy.ts';
import { readStudyBody, studyJson, studyReject } from '../modules/study/presentation/folders/uploads/http.ts';

const uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
// Keep the role explicit: a two-UUID teacher path must never resolve as a student list.
const teacher = new RegExp(`^/chat-attachments/teacher/(${uuid})(?:/(${uuid}))?$`, 'u');
const student = new RegExp(`^/chat-attachments/student/(${uuid})/(${uuid})(?:/(${uuid}))?$`, 'u');
type Service = ReturnType<typeof createChatAttachmentService>;
type Admit = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

export function installChatAttachmentTransport(app: Pick<INestApplication, 'use'>, service: Service, admit: Admit) {
  let active = 0;
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const raw = request.url ?? '';
    if (!raw.startsWith('/chat-attachments/')) { next(); return; }
    if (!raw.startsWith('/chat-attachments/teacher/') && !raw.startsWith('/chat-attachments/student/')) {
      studyJson(response, 404, { error: { code: 'NOT_FOUND' } });
      return;
    }
    const url = new URL(raw, 'http://attachments.invalid');
    const t = teacher.exec(url.pathname), s = student.exec(url.pathname);
    if ((!t && !s) || /[%\\#]/u.test(raw.split('?')[0]!)) {
      studyJson(response, 404, { error: { code: 'NOT_FOUND' } });
      return;
    }
    const method = request.method ?? '', id = s?.[3] ?? t?.[2];
    const target = { conversationId: (s?.[2] ?? t?.[1])!, folderId: s?.[1] };
    if (!(id ? ['PUT', 'DELETE'] : ['GET']).includes(method)) {
      studyJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED' } });
      return;
    }
    if (active >= 4) { studyReject(response, {}); return; }
    active++;
    void (async () => {
      await admit(request, response);
      const keys = [...url.searchParams.keys()];
      if (new Set(keys).size !== keys.length || keys.some(key => method !== 'PUT' || !['name', 'copy'].includes(key))) attachmentError('INVALID_INPUT');
      if (method === 'GET') {
        studyJson(response, 200, { items: await service.list(request, target) });
      } else if (method === 'DELETE') {
        await service.remove(request, target, id!);
        studyJson(response, 200, { removed: true });
      } else {
        if (request.headers['content-type'] !== 'application/octet-stream' || request.headers['content-encoding']) attachmentError('INVALID_UPLOAD');
        const intent = parseChatAttachmentIntent(url.searchParams.get('name') ?? undefined, url.searchParams.get('copy') ?? undefined, Boolean(s));
        await service.authorize(request, target, true);
        const bytes = await readStudyBody(request, CHAT_ATTACHMENT_BYTES);
        studyJson(response, 200, { attachment: await service.upload(request, target, id!, intent, bytes) });
      }
    })().catch(error => studyReject(response, error)).finally(() => active--);
  });
}
