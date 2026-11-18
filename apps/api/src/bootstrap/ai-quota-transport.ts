import type { INestApplication } from '@nestjs/common';
import type { SqlDatabase } from '../../../../src/core/contracts/sql.ts';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { IdentityHttpError } from '../modules/identity/domain/errors.ts';
import { readAiMonthlyBudget } from '../platform/ai/monthly-budget.ts';
import { createAiQuotaHandler } from './ai-quota-http.ts';
import type { IdentityRuntime } from './identity-runtime.ts';

export function installAiQuotaTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, database: SqlDatabase) {
  app.use(createAiQuotaHandler({
    async admit(request, response) {
      const cookie = readSessionCookie(request.headers.cookie);
      const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
      if (cookie.present && !context) response.setHeader('Set-Cookie', clearSessionCookie(runtime.configuration.security));
      const ip = request.socket.remoteAddress;
      if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
      await runtime.generalAdmission(ip, context);
      if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
      if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
      return context.sessionId;
    },
    read(request, sessionId, previous) {
      return database.$transaction(async raw => {
        const tx = { query: <T>(sql: string, ...values: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...values) };
        const { verifier } = readSessionCookie(request.headers.cookie);
        const context = verifier ? await authenticateSession(tx, verifier) : null;
        if (!context || context.sessionId !== sessionId) throw new IdentityHttpError('AUTH_REQUIRED');
        if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
        const subjectId = context.user.id;
        const balance = await (previous
          ? readAiMonthlyBudget(tx, subjectId, previous)
          : readAiMonthlyBudget(tx, subjectId));
        return balance && { ...balance, subjectId };
      }, { maxWait: 1500, timeout: 2500 });
    },
  }));
}
