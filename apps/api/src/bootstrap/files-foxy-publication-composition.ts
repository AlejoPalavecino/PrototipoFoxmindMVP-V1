import { createDurableFoxyPublicationFiles as createAdapter } from '../modules/files/custody/infrastructure/foxy-publication-files.ts';
import type { FileService } from '../modules/files/custody/infrastructure/service.ts';
import type { FoxyPublicationAuthorityPort } from '../modules/foxy/public.ts';
import { createFoxyUnitOfWork } from '../modules/foxy/conversations/infrastructure/unit-of-work.ts';
import { createFoxyPublicationFileAllocator } from './foxy-service-factories.ts';

/** Bind the two owners at the host; custody and capability checks remain in their adapters. */
export function createDurableFoxyPublicationFiles(options: { files: FileService; authority: FoxyPublicationAuthorityPort }) {
  return createAdapter({ ...options, createAllocator(files, access) {
    const uow = createFoxyUnitOfWork({ database: options.files.store.database,
      authenticate: async (tx, request) => access.authenticate(tx, request, 'upload') });
    return createFoxyPublicationFileAllocator({ uow, files });
  } });
}
