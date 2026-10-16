import { Module, type DynamicModule } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.ts';
import { createPasswordService } from '../identity-security/index.ts';
import type { IdentityRuntimeConfiguration } from './configuration.ts';
import { IdentityStore } from './persistence.ts';
import { IdentityRuntime, type IdentityRuntimePorts } from './runtime.ts';

@Module({})
export class IdentityModule {
  static register(databaseModule: DynamicModule, configuration: IdentityRuntimeConfiguration, ports: IdentityRuntimePorts = {}): DynamicModule {
    if (!configuration?.security || !configuration.outbox || !configuration.mail) throw new Error('Identity startup unavailable.');
    return {
      module: IdentityModule,
      imports: [databaseModule],
      providers: [{
        provide: IdentityRuntime, inject: [PrismaService],
        useFactory: async (database: PrismaService) => new IdentityRuntime(configuration, new IdentityStore(database), await createPasswordService(), ports),
      }],
      exports: [IdentityRuntime],
    };
  }
}
