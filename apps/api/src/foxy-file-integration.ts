import type { FileService } from './files/index.ts';
import { createDurableFoxyDocumentReader, createFoxyPrivateAssetFiles, createFoxyPrivateImageInspector } from './files/public/index.ts';
import { createLibraryMaterialPublisher } from './classrooms/public/index.ts';
import type { FoxyFileOperations } from './foxy-ai/file-operations.ts';

export function createFoxyFileOperations(files: FileService): FoxyFileOperations {
  return {
    read: (...args) => files.read(...args),
    readPrivateAsset: typeof files.storage?.get === 'function' ? (key, maxBytes) => files.storage.get(key, maxBytes) : undefined,
    documents: authorizeDocument => createDurableFoxyDocumentReader({ files, authorizeDocument }),
    visualCustody: (authority, renew) => createFoxyPrivateAssetFiles({ files, authority, renew, inspector: createFoxyPrivateImageInspector() }),
    publicationFiles(authority) {
      type Bridge = ReturnType<FoxyFileOperations['publicationFiles']>;
      let bridge: Promise<Bridge> | undefined;
      const get = () => bridge ??= import('./files/public/index.ts').then(api => api.createDurableFoxyPublicationFiles({ files, authority }));
      return {
        ensureFile: async (...args) => (await get()).ensureFile(...args),
        inspect: async (...args) => (await get()).inspect(...args),
        receive: async (...args) => (await get()).receive(...args),
        proof: async (...args) => (await get()).proof(...args),
      };
    },
    publicationRaster: authority => ({
      async read(capability, signal) {
        const api = await import('./files/public/index.ts');
        return api.createDurableFoxyPublicationRasterSource({ files, authority, inspector: api.createFoxyPrivateImageInspector() }).read(capability, signal);
      },
    }),
    publishMaterial: createLibraryMaterialPublisher({ files: files.store }).publish,
  };
}
