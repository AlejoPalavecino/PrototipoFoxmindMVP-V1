import { Module, type DynamicModule } from '@nestjs/common';
import type { AttemptWriteAuthorizer } from '../modules/files/infrastructure/access.ts';
import { FileService, type FileServiceOptions } from '../modules/files/infrastructure/service.ts';
import { FileCleanupWorker } from '../modules/files/infrastructure/cleanup-worker.ts';
import { PrismaService } from '../platform/database/prisma.service.ts';
import { IdentityRuntime } from './identity-runtime.ts';
import { FileHostLifecycle, createIdentityFileAccess } from './files-host.ts';
import type { FileInfrastructure, FileRuntimeConfiguration } from '../modules/files/infrastructure/configuration.ts';
import type { FileTransaction } from '../modules/files/application/contracts.ts';
import type { FileRow } from '../modules/files/infrastructure/store.ts';

export interface AttachmentIntegration {
  authorizeAttemptWrite: AttemptWriteAuthorizer;
  onReadyTransition(tx: FileTransaction, request: unknown,
    target: Pick<FileRow, 'purpose' | 'classroom_id' | 'target_id' | 'uploaded_by_id' | 'id'>): Promise<void>;
}

@Module({})
export class FilesModule {
  static register(options: FileServiceOptions): DynamicModule {
    return { module: FilesModule, providers: [
      { provide: FileService, useValue: new FileService(options) },
      { provide: FileCleanupWorker, inject: [FileService], useFactory: (service: FileService) => new FileCleanupWorker(service) },
    ], exports: [FileService] };
  }
  static integrated(database: DynamicModule, identity: DynamicModule, configuration: FileRuntimeConfiguration,
    infrastructure: FileInfrastructure, attachments: AttachmentIntegration): DynamicModule {
    return { module: FilesModule, imports: [database, identity], providers: [
      { provide: FileService, inject: [PrismaService, IdentityRuntime],
        useFactory: (database: PrismaService, runtime: IdentityRuntime) => new FileService({ database,
          access: createIdentityFileAccess(runtime.configuration.security, attachments.authorizeAttemptWrite), storage: infrastructure.storage,
          scanner: infrastructure.scanner, draftQuotaBytes: configuration.draftQuotaBytes,
          onReadyTransition: (tx, request, { purpose, classroom_id, target_id, uploaded_by_id, id }) =>
            attachments.onReadyTransition(tx, request, { purpose, classroom_id, target_id, uploaded_by_id, id }) }) },
      { provide: FileCleanupWorker, inject: [FileService], useFactory: (service: FileService) => new FileCleanupWorker(service) },
      { provide: FileHostLifecycle, inject: [FileCleanupWorker],
        useFactory: (worker: FileCleanupWorker) => new FileHostLifecycle(worker, infrastructure) },
    ], exports: [FileService, FileHostLifecycle] };
  }
}
