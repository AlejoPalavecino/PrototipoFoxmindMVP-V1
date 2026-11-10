import { isDeepStrictEqual } from 'node:util';
import { parseFoxyDiagram } from '../../../../../../src/core/domain/index.ts';
import { conflict, type AssetRow, type Metadata } from './private-asset-authority-db.ts';
function validText(value: unknown, max: number, empty = false): value is string {
  return typeof value === 'string' && (empty || !!value.trim()) && [...value].length <= max && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value);
}
export function validatePayload(raw: Metadata, row: AssetRow): Metadata {
  const m = structuredClone(raw);
  if (!m || typeof m !== 'object' || Object.keys(m).sort().join(',') !== 'description,diagram,digest,height,mimeType,producerVersion,sizeBytes,title,width'
    || !/^[a-f0-9]{64}$/u.test(m.digest) || !Number.isSafeInteger(m.sizeBytes) || m.sizeBytes < 1 || BigInt(m.sizeBytes) > BigInt(row.reserved_bytes)
    || !Number.isInteger(m.width) || !Number.isInteger(m.height) || m.width < 1 || m.height < 1 || m.width > 4096 || m.height > 4096
    || m.width * m.height > 4_000_000 || !['image/png','image/jpeg'].includes(m.mimeType)
    || !validText(m.title,200) || !validText(m.description,5000,true)) return conflict();
  if (row.kind === 'IMAGE') {
    if (m.producerVersion !== 'foxy-image-original-v1' || m.diagram !== null) return conflict();
  } else {
    const dimensions = { '1:1': [1600,1600], '4:3': [1600,1200], '3:4': [1200,1600], '16:9': [1920,1080] };
    const [width,height] = dimensions[row.aspect_ratio];
    if (m.producerVersion !== 'foxy-diagram-png-v1' || m.mimeType !== 'image/png' || m.width !== width || m.height !== height) return conflict();
    try { const diagram = parseFoxyDiagram(m.diagram); if (!diagram.nodes.length || diagram.title !== m.title || diagram.description !== m.description || !isDeepStrictEqual(diagram,m.diagram)) return conflict(); }
    catch { return conflict(); }
  }
  return m;
}
