import { Module, type DynamicModule } from '@nestjs/common';
import { FileService, type FileServiceOptions } from './service.ts';
import { FileCleanupWorker } from './cleanup-worker.ts';
import { PrismaService } from '../database/prisma.service.ts';
import { IdentityRuntime } from '../identity/runtime.ts';
import { FileHostLifecycle, createIdentityFileAccess } from './host.ts';
import type { FileInfrastructure, FileRuntimeConfiguration } from './configuration.ts';

@Module({})
export class FilesModule {
  static register(options: FileServiceOptions): DynamicModule {
    return { module: FilesModule, providers: [
      { provide: FileService, useValue: new FileService(options) },
      { provide: FileCleanupWorker, inject: [FileService], useFactory: (service: FileService) => new FileCleanupWorker(service) },
    ], exports: [FileService] };
  }
  static integrated(database: DynamicModule, identity: DynamicModule, configuration: FileRuntimeConfiguration,
    infrastructure: FileInfrastructure): DynamicModule {
    return { module: FilesModule, imports: [database, identity], providers: [
      { provide: FileService, inject: [PrismaService, IdentityRuntime],
        useFactory: (database: PrismaService, runtime: IdentityRuntime) => new FileService({ database,
          access: createIdentityFileAccess(runtime.configuration.security), storage: infrastructure.storage,
          scanner: infrastructure.scanner, draftQuotaBytes: configuration.draftQuotaBytes }) },
      { provide: FileCleanupWorker, inject: [FileService], useFactory: (service: FileService) => new FileCleanupWorker(service) },
      { provide: FileHostLifecycle, inject: [FileCleanupWorker],
        useFactory: (worker: FileCleanupWorker) => new FileHostLifecycle(worker, infrastructure) },
    ], exports: [FileService, FileHostLifecycle] };
  }
}
