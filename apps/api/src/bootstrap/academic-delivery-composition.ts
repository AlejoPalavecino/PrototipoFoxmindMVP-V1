import { validateMailbox } from '../modules/identity/mail-delivery/infrastructure/mail/mailbox.ts';
import { InvitationDeliveryWorker as Adapter, localInvitationSender as sender } from '../modules/classrooms/invitations/infrastructure/delivery.ts';
export type { DeliveryOptions, InvitationMessage } from '../modules/classrooms/invitations/infrastructure/delivery.ts';
export class InvitationDeliveryWorker extends Adapter {
 constructor(options: ConstructorParameters<typeof Adapter>[0]) { super(options, validateMailbox); }
}
export function localInvitationSender(port: number, from: string) { return sender(port, from, validateMailbox); }
