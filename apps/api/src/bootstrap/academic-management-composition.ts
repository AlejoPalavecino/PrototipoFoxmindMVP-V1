import { randomUUID } from 'node:crypto';
import { DraftService as DraftApplication, createDraftPublicationOperations } from '../modules/classrooms/drafts/public.ts';
import { MembershipService as MembershipApplication, createMembershipCodeOperations, createMembershipLifecycleOperations } from '../modules/classrooms/memberships/public.ts';
import { InvitationService as InvitationApplication, createInvitationIssueOperations, InvitationBatchOperations } from '../modules/classrooms/invitations/public.ts';
import { createSettingsOperations } from '../modules/classrooms/settings/public.ts';
import { createDraftsRepository } from '../modules/classrooms/drafts/infrastructure/drafts-repository.ts';
import { createPublicationRepository } from '../modules/classrooms/drafts/infrastructure/drafts-operations-repository.ts';
import { createSettingsRepository } from '../modules/classrooms/settings/infrastructure/settings-repository.ts';
import { createMembershipsRepository } from '../modules/classrooms/memberships/infrastructure/memberships-repository.ts';
import { createMembershipCodeRepository } from '../modules/classrooms/memberships/infrastructure/membership-code-operations-repository.ts';
import { createMembershipLifecycleRepository } from '../modules/classrooms/memberships/infrastructure/membership-lifecycle-operations-repository.ts';
import { newClassroomCode as generateClassroomCode } from '../modules/classrooms/memberships/infrastructure/classroom-codes.ts';
import { createInvitationsRepository } from '../modules/classrooms/invitations/infrastructure/invitations-repository.ts';
import { createInvitationIssueRepository } from '../modules/classrooms/invitations/infrastructure/invitations-operations-repository.ts';
import { createInvitationBatchRepository } from '../modules/classrooms/invitations/infrastructure/invitation-batches-repository.ts';
import { decryptDelivery, encryptDelivery } from '../modules/classrooms/invitations/infrastructure/delivery-envelope.ts';
import { digest } from '../modules/classrooms/access/infrastructure/policy.ts';
import { classroomCodeDigests, type ClassroomCodeKeys } from '../platform/crypto/classroom-code-digest.ts';
import { recordActivityEligibility } from '../modules/participation/attempts/infrastructure/activity-eligibility.ts';
import type { ClassroomRuntimeAccess, Transaction } from '../modules/classrooms/access/public.ts';

const publication = createDraftPublicationOperations(createPublicationRepository(), {
 randomUUID, newClassroomCode: (tx, id, keys) => newClassroomCode(tx, id, keys),
});
const settings = createSettingsOperations(createSettingsRepository());
const codes = createMembershipCodeOperations(createMembershipCodeRepository(), { codeDigests: classroomCodeDigests });
const lifecycle = createMembershipLifecycleOperations(createMembershipLifecycleRepository());
const issues = createInvitationIssueOperations(createInvitationIssueRepository(), { randomUUID, sealMessage: encryptDelivery });

export class DraftService extends DraftApplication {
 constructor(context: Pick<ClassroomRuntimeAccess,'run'|'classroom'|'ports'>) {
  super(context,createDraftsRepository(),{ randomUUID,
   publishDraft: (draft,request,id,input) => publication.publishDraftOperation({run:context.run.bind(context),classroom:context.classroom.bind(context),ports:context.ports,draft:draft.draft.bind(draft)},request,id,input),
   updateSettings: (_draft,request,id,input) => settings.updateSettingsOperation(context,request,id,input) });
 }
}
export class MembershipService extends MembershipApplication {
 constructor(context: ConstructorParameters<typeof MembershipApplication>[0], dependencies: ConstructorParameters<typeof MembershipApplication>[1]) {
  super(context, dependencies, createMembershipsRepository(), { randomUUID, digest, recordActivityEligibility, ...codes, ...lifecycle });
 }
}
export class InvitationService extends InvitationApplication {
 constructor(context: Pick<ClassroomRuntimeAccess,'run'|'classroom'|'ports'>, dependencies: ConstructorParameters<typeof InvitationApplication>[1]) {
  super(context, dependencies, createInvitationsRepository(), { invite: (request,id,input)=>issues.inviteOperation(context,request,id,input),
   batch: new InvitationBatchOperations(context, createInvitationBatchRepository(), issues, { sealReceipt: encryptDelivery, openReceipt: decryptDelivery }),
   recipient: (envelope,aad)=>context.ports.validateMailbox(decryptDelivery(context.ports.deliveryKey,envelope,aad).to) });
 }
}

// Composition exports keep focused adapter consumers on assembled operations.
export const { publishDraftOperation } = publication;
export const { updateSettingsOperation } = settings;
export const { previewCodeOperation, confirmCodeOperation } = codes;
export const { endMembershipOperation, membersOperation } = lifecycle;
export function newClassroomCode(tx: Transaction, classroomId: string, keys: ClassroomCodeKeys & { deliveryKey: Buffer }) {
 return generateClassroomCode(tx, classroomId, keys.deliveryKey, code => classroomCodeDigests(keys, code), encryptDelivery);
}
