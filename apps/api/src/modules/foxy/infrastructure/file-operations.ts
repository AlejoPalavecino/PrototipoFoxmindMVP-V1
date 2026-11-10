import type { FoxyDocumentReader, AuthorizeDocument, FoxyPrivateAssetFiles, RenewPrivateAsset, FoxyPublicationFiles, FoxyPublicationRasterSource } from '../../files/public.ts';
import type { FoxyPrivateAssetAuthorityPort, FoxyPublicationAuthorityPort } from '../application/authority-ports.ts';
import type { MaterialPublisherPort } from '../../materials/public.ts';
type Read = (request: unknown, id: string, mode: 'preview' | 'download') => Promise<{ bytes: Uint8Array }>;
export interface FoxyFileOperations {
 read: Read;
 readPrivateAsset?: (key: string, maxBytes: number) => Promise<Uint8Array>;
 documents(authorize: AuthorizeDocument): FoxyDocumentReader;
 visualCustody(authority: FoxyPrivateAssetAuthorityPort, renew: RenewPrivateAsset): FoxyPrivateAssetFiles;
 publicationFiles(authority: FoxyPublicationAuthorityPort): FoxyPublicationFiles;
 publicationRaster(authority: FoxyPublicationAuthorityPort): FoxyPublicationRasterSource;
 publishMaterial: MaterialPublisherPort['publish'];
}
