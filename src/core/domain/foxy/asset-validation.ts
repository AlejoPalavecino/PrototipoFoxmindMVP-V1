import type { ReserveFoxyPrivateAsset, DiscardFoxyPrivateAsset, EditFoxyPrivateAsset } from './asset.ts';
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
export function parseDiscardFoxyPrivateAsset(value: unknown): DiscardFoxyPrivateAsset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const x = value as Record<string, unknown>;
  if (Object.keys(x).sort().join(',') !== 'assetRevision,confirm,requestId' || x.confirm !== true
    || typeof x.assetRevision !== 'string' || !/^(0|[1-9][0-9]*)$/u.test(x.assetRevision)
    || x.assetRevision.length > 19 || BigInt(x.assetRevision) > 9223372036854775807n) return invalid();
  return { requestId: assetUuid(x.requestId), assetRevision: x.assetRevision, confirm: true };
}

export function parseEditFoxyPrivateAsset(value: unknown): EditFoxyPrivateAsset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const x = value as Record<string, unknown>;
  if (Object.keys(x).sort().join(',') !== 'description,expectedRevision,requestId,title'
    || typeof x.expectedRevision !== 'string' || !/^(0|[1-9][0-9]*)$/u.test(x.expectedRevision)
    || x.expectedRevision.length > 19 || BigInt(x.expectedRevision) > 9223372036854775807n
    || typeof x.title !== 'string' || !x.title.trim() || [...x.title].length > 200 || /[\u0000-\u001f\u007f-\u009f]/u.test(x.title)
    || typeof x.description !== 'string' || [...x.description].length > 12000 || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(x.description)) return invalid();
  return { requestId: assetUuid(x.requestId), expectedRevision: x.expectedRevision, title: x.title, description: x.description };
}
