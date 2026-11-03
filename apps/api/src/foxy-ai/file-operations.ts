import type { createDurableFoxyDocumentReader, createDurableFoxyPublicationFiles, createDurableFoxyPublicationRasterSource,
  createFoxyPrivateAssetFiles } from '../files/public/index.ts';
import type { createLibraryMaterialPublisher } from '../classrooms/public/index.ts';

type Read = (request: unknown, id: string, mode: 'preview' | 'download') => Promise<{ bytes: Uint8Array }>;
export type FoxyFileOperations = {
  read: Read;
  readPrivateAsset?: (key: string, maxBytes: number) => Promise<Uint8Array>;
  documents(authorize: Parameters<typeof createDurableFoxyDocumentReader>[0]['authorizeDocument']): ReturnType<typeof createDurableFoxyDocumentReader>;
  visualCustody(authority: Parameters<typeof createFoxyPrivateAssetFiles>[0]['authority'],
    renew: Parameters<typeof createFoxyPrivateAssetFiles>[0]['renew']): ReturnType<typeof createFoxyPrivateAssetFiles>;
  publicationFiles(authority: Parameters<typeof createDurableFoxyPublicationFiles>[0]['authority']): ReturnType<typeof createDurableFoxyPublicationFiles>;
  publicationRaster(authority: Parameters<typeof createDurableFoxyPublicationRasterSource>[0]['authority']): ReturnType<typeof createDurableFoxyPublicationRasterSource>;
  publishMaterial: ReturnType<typeof createLibraryMaterialPublisher>['publish'];
};
