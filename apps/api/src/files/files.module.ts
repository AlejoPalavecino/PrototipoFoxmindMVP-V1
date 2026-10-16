import { Module, type DynamicModule } from '@nestjs/common';
import { FileService, type FileServiceOptions } from './service.ts';
import { FileCleanupWorker } from './cleanup-worker.ts';

@Module({})
export class FilesModule {
  static register(options: FileServiceOptions): DynamicModule {
    return { module: FilesModule, providers: [
      { provide: FileService, useValue: new FileService(options) },
      { provide: FileCleanupWorker, inject: [FileService], useFactory: (service: FileService) => new FileCleanupWorker(service) },
    ], exports: [FileService] };
  }
}
