import { randomUUID } from 'node:crypto';
import { DraftService as DraftApplication } from '../modules/classrooms/application/drafts.ts';
import { MembershipService as MembershipApplication } from '../modules/classrooms/application/memberships.ts';
import { InvitationService as InvitationApplication } from '../modules/classrooms/application/invitations.ts';
import { createDraftsRepository } from '../modules/classrooms/infrastructure/drafts-repository.ts';
import { createMembershipsRepository } from '../modules/classrooms/infrastructure/memberships-repository.ts';
import { createInvitationsRepository } from '../modules/classrooms/infrastructure/invitations-repository.ts';
import { publishDraftOperation, updateSettingsOperation } from '../modules/classrooms/infrastructure/drafts-operations.ts';
import { previewCodeOperation, confirmCodeOperation } from '../modules/classrooms/infrastructure/memberships-operations-1.ts';
import { endMembershipOperation, membersOperation } from '../modules/classrooms/infrastructure/memberships-operations-2.ts';
import { InvitationBatchOperations } from '../modules/classrooms/infrastructure/invitation-batches.ts';
import { inviteOperation } from '../modules/classrooms/infrastructure/invitations-operations.ts';
import { decryptDelivery } from '../modules/classrooms/infrastructure/delivery-envelope.ts';
import { digest } from '../modules/classrooms/infrastructure/policy.ts';
import { recordActivityEligibility } from '../modules/participation/infrastructure/activity-eligibility.ts';
import type { ClassroomRuntimeAccess } from '../modules/classrooms/infrastructure/access.ts';
export class DraftService extends DraftApplication {
 constructor(context: Pick<ClassroomRuntimeAccess,'run'|'classroom'|'ports'>) {
  super(context,createDraftsRepository(),{ randomUUID,
   publishDraft: (draft,request,id,input) => publishDraftOperation({run:context.run.bind(context),classroom:context.classroom.bind(context),ports:context.ports,draft:draft.draft.bind(draft)},request,id,input),
   updateSettings: (draft,request,id,input) => updateSettingsOperation({run:context.run.bind(context),classroom:context.classroom.bind(context),ports:context.ports,draft:draft.draft.bind(draft)},request,id,input) });
 }
}
export class MembershipService extends MembershipApplication {
 constructor(context: ConstructorParameters<typeof MembershipApplication>[0], dependencies: ConstructorParameters<typeof MembershipApplication>[1]) {
  super(context, dependencies, createMembershipsRepository(), { randomUUID, digest, recordActivityEligibility, previewCodeOperation, confirmCodeOperation, endMembershipOperation, membersOperation });
 }
}
export class InvitationService extends InvitationApplication {
 constructor(context: Pick<ClassroomRuntimeAccess,'run'|'classroom'|'ports'>, dependencies: ConstructorParameters<typeof InvitationApplication>[1]) {
  super(context, dependencies, createInvitationsRepository(), { invite: (request,id,input)=>inviteOperation(context,request,id,input),
   batch: new InvitationBatchOperations(context),
   recipient: (envelope,aad)=>context.ports.validateMailbox(decryptDelivery(context.ports.deliveryKey,envelope,aad).to) });
 }
}
