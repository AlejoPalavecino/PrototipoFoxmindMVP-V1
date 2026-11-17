import type { FileService } from '../modules/files/custody/infrastructure/service.ts';
import { createDurableFoxyDocumentReader } from '../modules/files/custody/infrastructure/foxy-durable-document-reader.ts';
import { createFoxyPrivateAssetFiles } from '../modules/files/custody/infrastructure/foxy-private-asset-files.ts';
import { createFoxyPrivateImageInspector } from '../modules/files/custody/infrastructure/foxy-private-image-inspector.ts';
import { createLibraryMaterialPublisher } from './academic-materials-composition.ts';
import type { FoxyFileOperations } from '../modules/foxy/application/file-operations.ts';
import { attachmentSources, readAttachment } from '../modules/files/custody/infrastructure/chat-attachment-repository.ts';

export function createFoxyFileOperations(files: FileService): FoxyFileOperations {
  return {
    read: (...args) => files.read(...args),
    attachments: {
      list: (tx, ownerId, conversationId) => attachmentSources(tx, { ownerId, conversationId }),
      read: (source, signal) => readAttachment(files.storage, source, signal),
    },
    readPrivateAsset: typeof files.storage?.get === 'function' ? (key, maxBytes) => files.storage.get(key, maxBytes) : undefined,
    documents: authorizeDocument => createDurableFoxyDocumentReader({ files, authorizeDocument }),
    visualCustody: (authority, renew) => createFoxyPrivateAssetFiles({ files, authority, renew, inspector: createFoxyPrivateImageInspector() }),
    publicationFiles(authority) {
      type Bridge = ReturnType<FoxyFileOperations['publicationFiles']>;
      let bridge: Promise<Bridge> | undefined;
      const get = () => bridge ??= import('./files-composition.ts').then(api => api.createDurableFoxyPublicationFiles({ files, authority }));
      return {
        ensureFile: async (...args) => (await get()).ensureFile(...args),
        inspect: async (...args) => (await get()).inspect(...args),
        receive: async (...args) => (await get()).receive(...args),
        proof: async (...args) => (await get()).proof(...args),
      };
    },
    publicationRaster: authority => ({
      async read(capability, signal) {
        const api = await import('./files-composition.ts');
        return api.createDurableFoxyPublicationRasterSource({ files, authority, inspector: api.createFoxyPrivateImageInspector() }).read(capability, signal);
      },
    }),
    publishMaterial: createLibraryMaterialPublisher({ files: files.store }).publish,
  };
}
