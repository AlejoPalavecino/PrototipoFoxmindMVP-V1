import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { readSessionCookie } from '../modules/identity/presentation/transport.ts';
import { IdentityHttpError } from '../modules/identity/domain/errors.ts';
import { type IdentityRuntime } from './identity-runtime.ts';
import { clearSessionCookie } from '../modules/identity/presentation/session-cookies.ts';
import { createHomeHandler } from '../modules/home/presentation/http.ts';
import type { HomeService } from '../modules/home/application/service.ts';
export function installHomeTransport(app: Pick<INestApplication,'use'>, runtime: IdentityRuntime, service: HomeService): void {
  const handler = createHomeHandler(service,{ async admit(request, _write, response) {
    const cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
    if (cookie.present && !context) response.setHeader('Set-Cookie',clearSessionCookie(runtime.configuration.security));
    const ip = request.socket.remoteAddress;
    if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
    await runtime.generalAdmission(ip,context);
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
  } });
  app.use('/api/v1',(request:IncomingMessage,response:ServerResponse,next:()=>void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/home' && !path?.startsWith('/home/')) { next(); return; }
    response.setHeader('X-Request-Id',randomUUID()); handler(request,response,next);
  });
}
