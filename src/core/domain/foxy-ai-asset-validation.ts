import type { ReserveFoxyPrivateAsset } from './foxy-ai-asset.ts';
function invalid(): never { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); }
export function assetUuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value)) return invalid();
  return value.toLowerCase();
}
export function parseReserveFoxyPrivateAsset(value: unknown): ReserveFoxyPrivateAsset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const x = value as Record<string, unknown>;
  if (Object.keys(x).sort().join(',') !== 'aspectRatio,conversationRevision,kind,requestId') return invalid();
  if (typeof x.conversationRevision !== 'string' || !/^(0|[1-9][0-9]*)$/u.test(x.conversationRevision)
    || x.conversationRevision.length > 19 || BigInt(x.conversationRevision) > 9223372036854775807n) return invalid();
  if (x.kind !== 'DIAGRAM' && x.kind !== 'IMAGE') return invalid();
  if (x.aspectRatio !== '1:1' && x.aspectRatio !== '4:3' && x.aspectRatio !== '3:4' && x.aspectRatio !== '16:9') return invalid();
  return { requestId: assetUuid(x.requestId), conversationRevision: x.conversationRevision, kind: x.kind, aspectRatio: x.aspectRatio };
}
export function parseFoxyPrivateAssetQuota(value: unknown): bigint | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/u.test(value) || value.length > 19 || BigInt(value) > 9223372036854775807n) return invalid();
  return BigInt(value);
}
