import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { type IdentityRuntime } from './identity-runtime.ts';
import { admitRequest } from './http-admission.ts';
import { createHomeHandler } from '../modules/home/dashboard/presentation/http.ts';
import type { HomeService } from '../modules/home/public.ts';
export function installHomeTransport(app: Pick<INestApplication,'use'>, runtime: IdentityRuntime, service: HomeService): void {
  const handler = createHomeHandler(service,{ async admit(request, write, response) { await admitRequest(runtime, request, response, { write }); } });
  app.use('/api/v1',(request:IncomingMessage,response:ServerResponse,next:()=>void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/home' && !path?.startsWith('/home/')) { next(); return; }
    response.setHeader('X-Request-Id',randomUUID()); handler(request,response,next);
  });
}
