import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export { ClassroomError, fail, uuid, covers, object, text, draftPayload } from '../../domain/policy.ts';
export type { ClassroomErrorCode, CurriculumUnit, DraftPayload } from '../../domain/policy.ts';
import { fail } from '../../domain/policy.ts';
import { digest } from '../../../../platform/crypto/digest.ts';
export { digest } from '../../../../platform/crypto/digest.ts';
export interface PreviewData {
  actor: string;
  codeId: string;
  digest: string;
  classroomId: string;
  expires: number;
}
export class PreviewTokens {
  private readonly key: Buffer;
  constructor(key: Buffer) {
    if (!Buffer.isBuffer(key) || key.length !== 32) fail('SERVICE_UNAVAILABLE');
    this.key = Buffer.from(key);
  }
  issue(data: PreviewData): string {
    const body = Buffer.from(JSON.stringify(data)).toString('base64url');
    return `${body}.${this.mac(body).toString('base64url')}`;
  }
  read(token: unknown, actor: string, now: number): PreviewData {
    try {
      if (typeof token !== 'string' || token.length > 2048)
        return fail('ENROLLMENT_UNAVAILABLE');
      const [body, signature, extra] = token.split('.');
      const supplied = Buffer.from(signature ?? '', 'base64url'),
        expected = this.mac(body);
      if (
        extra !== undefined ||
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      )
        return fail('ENROLLMENT_UNAVAILABLE');
      const data = JSON.parse(
        Buffer.from(body, 'base64url').toString(),
      ) as PreviewData;
      if (
        data.actor !== actor ||
        !Number.isFinite(data.expires) ||
        now >= data.expires
      )
        return fail('ENROLLMENT_UNAVAILABLE');
      return data;
    } catch {
      return fail('ENROLLMENT_UNAVAILABLE');
    }
  }
  private mac(body: string) {
    return createHmac('sha256', this.key)
      .update('p5-preview:')
      .update(body)
      .digest();
  }
}
