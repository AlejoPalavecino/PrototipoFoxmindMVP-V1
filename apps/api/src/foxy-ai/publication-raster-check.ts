import { isDeepStrictEqual } from 'node:util';
import type { SqlTransaction } from '../../../../src/core/domain/index.ts';
import { createFoxyPrivateAssetReadRepository } from './private-asset-read-repository.ts';
export async function validRasterSource(tx: SqlTransaction, owner: string, assetId: string, snapshot: unknown): Promise<boolean> {
  try {
    const asset=await createFoxyPrivateAssetReadRepository().describe(tx,owner,assetId);
    return isDeepStrictEqual(snapshot,{kind:'VISUAL',assetId:asset.assetId,assetRevision:asset.assetRevision,digest:asset.digest,
      sizeBytes:asset.sizeBytes,mimeType:asset.mimeType,width:asset.width,height:asset.height,producerVersion:asset.producerVersion});
  } catch (error) {
    if (['NOT_FOUND','FILE_NOT_READY','FORBIDDEN','INVALID_INPUT'].includes(String((error as {code?:unknown})?.code))) return false;
    throw error;
  }
}
export const publicationFileFormat = `((p.source_kind='TEXT' AND f.extension='pdf' AND f.detected_mime_type='application/pdf' AND p.artifact_mime_type='application/pdf')
  OR (p.source_kind='VISUAL' AND p.artifact_mime_type IN ('image/png','image/jpeg') AND f.detected_mime_type=p.artifact_mime_type
    AND f.extension=CASE WHEN p.artifact_mime_type='image/png' THEN 'png' ELSE 'jpg' END))`;
