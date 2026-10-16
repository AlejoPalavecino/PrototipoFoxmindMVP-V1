import { Module, type DynamicModule } from '@nestjs/common';
import { FileService, type FileServiceOptions } from './service.ts';

@Module({})
export class FilesModule {
  static register(options: FileServiceOptions): DynamicModule {
    return { module: FilesModule, providers: [{ provide: FileService, useValue: new FileService(options) }], exports: [FileService] };
  }
}
