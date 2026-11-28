import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { createChatAttachmentService } from '../modules/files/custody/infrastructure/chat-attachment-service.ts';
import { attachmentError, CHAT_ATTACHMENT_BYTES, parseChatAttachmentIntent } from '../modules/files/chat-attachments/domain/policy.ts';
import { readStudyBody, studyJson, studyReject } from '../modules/study/folders/presentation/uploads/http.ts';
import { createTransferGate, type TransferGate } from '../platform/http/transfer-gate.ts';
import { uploadDeadlineMs } from '../../../../src/core/domain/documents/document-formats.ts';

const uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
// Keep the role explicit: a two-UUID teacher path must never resolve as a student list.
const teacher = new RegExp(`^/chat-attachments/teacher/(${uuid})(?:/(${uuid})(/file)?)?$`, 'u');
const student = new RegExp(`^/chat-attachments/student/(${uuid})/(${uuid})(?:/(${uuid}))?$`, 'u');
type Service = ReturnType<typeof createChatAttachmentService>;
/** Resolves the authenticated account, or null; the service still authorizes every operation. */
type Admit = (request: IncomingMessage, response: ServerResponse) => Promise<string | null>;

export function installChatAttachmentTransport(app: Pick<INestApplication, 'use'>, service: Service, admit: Admit, transfers: TransferGate = createTransferGate()) {
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
    const method = request.method ?? '', id = s?.[3] ?? t?.[2], file = Boolean(t?.[3]);
    const target = { conversationId: (s?.[2] ?? t?.[1])!, folderId: s?.[1] };
    if (!(file ? ['GET'] : id ? ['PUT', 'DELETE'] : ['GET']).includes(method)) {
      studyJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED' } });
      return;
    }
    if (active >= 16) { studyReject(response, {}); return; }
    active++;
    let release: (() => void) | undefined;
    void (async () => {
      const owner = await admit(request, response);
      // Only byte transfers take a slot; listing and removal do not.
      if (file || method === 'PUT') {
        release = transfers.acquire(owner ?? '');
        if (!release) throw { code: 'SERVICE_UNAVAILABLE' };
      }
      const keys = [...url.searchParams.keys()];
      if (new Set(keys).size !== keys.length || keys.some(key => file ? key !== 'mode' : method !== 'PUT' || !['name', 'copy'].includes(key))) attachmentError('INVALID_INPUT');
      if (file) {
        const mode = url.searchParams.get('mode') ?? 'preview';
        if (!['preview', 'download'].includes(mode)) attachmentError('INVALID_INPUT');
        const result = await service.read(request, target, id!);
        const mime = result.extension === 'pdf' ? 'application/pdf' : result.extension === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : result.extension === 'pptx'
            ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/octet-stream';
        const name = encodeURIComponent(result.name).replace(/['()*]/gu, value => `%${value.charCodeAt(0).toString(16).toUpperCase()}`);
        response.writeHead(200, { 'Content-Type': mime, 'Content-Length': result.bytes.length,
          'Content-Disposition': `${mode === 'preview' && result.extension === 'pdf' ? 'inline' : 'attachment'}; filename="file.${result.extension}"; filename*=UTF-8''${name}`,
          'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin',
          'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self'" });
        response.end(result.bytes);
      } else if (method === 'GET') {
        studyJson(response, 200, { items: await service.list(request, target) });
      } else if (method === 'DELETE') {
        await service.remove(request, target, id!);
        studyJson(response, 200, { removed: true });
      } else {
        if (request.headers['content-type'] !== 'application/octet-stream' || request.headers['content-encoding']) attachmentError('INVALID_UPLOAD');
        const intent = parseChatAttachmentIntent(url.searchParams.get('name') ?? undefined, url.searchParams.get('copy') ?? undefined, Boolean(s));
        await service.authorize(request, target, true);
        // Size-based total deadline (F8); without a usable declared length, the largest allowed attachment.
        const declared = Number(request.headers['content-length']);
        const expected = Number.isSafeInteger(declared) && declared > 0 ? Math.min(declared, CHAT_ATTACHMENT_BYTES) : CHAT_ATTACHMENT_BYTES;
        const bytes = await readStudyBody(request, CHAT_ATTACHMENT_BYTES, uploadDeadlineMs(expected), 5000, true);
        studyJson(response, 200, { attachment: await service.upload(request, target, id!, intent, bytes) });
      }
    })().catch(error => studyReject(response, error)).finally(() => { active--; release?.(); });
  });
}
