import { Module, type DynamicModule } from '@nestjs/common';
import { InvitationService } from './invitations.ts';
import { InvitationDeliveryWorker, type DeliveryOptions } from './delivery.ts';
import type { ClassroomPorts } from './contracts.ts';

@Module({})
export class ClassroomsModule {
  static register(
    ports: ClassroomPorts,
    delivery: Omit<DeliveryOptions, 'database' | 'key'>,
  ): DynamicModule {
    return {
      module: ClassroomsModule,
      providers: [
        { provide: InvitationService, useValue: new InvitationService(ports) },
        {
          provide: InvitationDeliveryWorker,
          useValue: new InvitationDeliveryWorker({
            ...delivery,
            database: ports.database,
            key: ports.deliveryKey,
          }),
        },
      ],
      exports: [InvitationService],
    };
  }
}
