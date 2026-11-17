import { createFoxyVisualService as visual } from '../modules/foxy/visuals/application/visual-service.ts';
import { activeClassroom } from '../modules/foxy/turns/infrastructure/turn-authority.ts';
import { createHash } from 'node:crypto';
import { createFoxyConversationService as conversation } from '../modules/foxy/conversations/application/conversation-service.ts';
import { createFoxyTurnService as turn } from '../modules/foxy/turns/application/turn-service.ts';
import { createFoxyResourceService as resource } from '../modules/foxy/resources/application/resource-service.ts';
import { createFoxyCitationService as citation } from '../modules/foxy/citations/application/citation-service.ts';
import { ownedRoom, activeRoom } from '../modules/foxy/turns/infrastructure/turn-authority.ts';
import { rebuildGrounding, assertFoxyFileQuota } from '../modules/foxy/turns/infrastructure/grounding-rebuild.ts';
import { prepareFoxyActivity as prepareActivity } from '../modules/foxy/resources/infrastructure/activity-handoff.ts';
import { createActivityDraftInTransaction } from '../modules/activities/generation/infrastructure/activity-draft.ts';
import { createCitationFileReader } from '../modules/foxy/citations/infrastructure/citation-read.ts';
import { mapFoxyCitations } from '../modules/foxy/citations/infrastructure/citation-mapping.ts';
import { loadCitationTurn, citationDocument, textActivity, citationAttachment } from '../modules/foxy/citations/infrastructure/citation-repository.ts';
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export function createFoxyConversationService(options: Omit<Parameters<typeof conversation>[0], 'digest'>) { return conversation({ ...options, digest }); }
export function createFoxyTurnService(options: Omit<Parameters<typeof turn>[0], 'digest' | 'authority' | 'rebuildGrounding'>) {
 return turn({ ...options, digest, authority: { ownedRoom, activeRoom }, rebuildGrounding, checkFileQuota: assertFoxyFileQuota });
}
export function createFoxyResourceService(options: Omit<Parameters<typeof resource>[0], 'prepareActivity'>) { return resource({ ...options, prepareActivity: prepareFoxyActivity }); }
export function createFoxyCitationService(options: { uow: Parameters<typeof citation>[0]['uow']; files: unknown }) {
 const readFile = createCitationFileReader(options);
 return citation({ uow: options.uow, readFile, citations: { loadTurn: loadCitationTurn, document: citationDocument, map: mapFoxyCitations, textActivity, attachment: citationAttachment, readFile } });
}

export function prepareFoxyActivity(...args: Parameters<Parameters<typeof resource>[0]['prepareActivity']>) { return prepareActivity(...args,createActivityDraftInTransaction); }

export function createFoxyVisualService(options: Omit<Parameters<typeof visual>[0], 'activeClassroom' | 'rebuildGrounding'>) { return visual({ ...options, activeClassroom, rebuildGrounding, checkFileQuota: assertFoxyFileQuota }); }


// Host-only collaboration adapters; row authority stays inside each receiving transaction.
import { checkVisualClaim } from '../modules/foxy/visuals/infrastructure/visual-claim-check.ts';
import { snapshotSelection } from '../modules/foxy/turns/infrastructure/grounding-rebuild.ts';
import { refreshFoxyAttachmentSnapshot } from '../modules/foxy/turns/infrastructure/claim-authority-check.ts';
import { createFoxyPrivateAssetReadRepository } from '../modules/foxy/private-assets/infrastructure/private-asset-read-repository.ts';
const visualGrounding = { rebuildGrounding, snapshotSelection, refreshFoxyAttachmentSnapshot };
import { createFoxyPrivateAssetAuthority as createFoxyPrivateAssetAuthorityAdapter } from '../modules/foxy/private-assets/infrastructure/private-asset-authority.ts';
export function createFoxyPrivateAssetAuthority(options: Omit<Parameters<typeof createFoxyPrivateAssetAuthorityAdapter>[0], 'checkVisualClaim'>) { return createFoxyPrivateAssetAuthorityAdapter({ ...options, checkVisualClaim: (tx, lease, age) => checkVisualClaim(tx, lease, age, visualGrounding) }); }
import { createFoxyVisualClaimAuthority as createFoxyVisualClaimAuthorityAdapter } from '../modules/foxy/visuals/infrastructure/visual-claim-authority.ts';
export function createFoxyVisualClaimAuthority(options: Omit<Parameters<typeof createFoxyVisualClaimAuthorityAdapter>[0], 'grounding'>) { return createFoxyVisualClaimAuthorityAdapter({ ...options, grounding: visualGrounding }); }
import { createFoxyVisualQueue as createFoxyVisualQueueAdapter } from '../modules/foxy/visuals/infrastructure/visual-queue.ts';
export function createFoxyVisualQueue(options: Omit<Parameters<typeof createFoxyVisualQueueAdapter>[0], 'grounding'>) { return createFoxyVisualQueueAdapter({ ...options, grounding: visualGrounding }); }
import { createFoxyVisualCompletion as createFoxyVisualCompletionAdapter } from '../modules/foxy/visuals/infrastructure/visual-completion.ts';
export function createFoxyVisualCompletion(options: Omit<Parameters<typeof createFoxyVisualCompletionAdapter>[0], 'grounding'>) { return createFoxyVisualCompletionAdapter({ ...options, grounding: visualGrounding }); }
import { createFoxyPublicationAuthority as createFoxyPublicationAuthorityAdapter } from '../modules/foxy/publications/infrastructure/publication-authority.ts';
export function createFoxyPublicationAuthority(options: Omit<Parameters<typeof createFoxyPublicationAuthorityAdapter>[0], 'assets'>) { return createFoxyPublicationAuthorityAdapter({ ...options, assets: createFoxyPrivateAssetReadRepository() }); }
import { createFoxyPublicationCompletion as createFoxyPublicationCompletionAdapter } from '../modules/foxy/publications/infrastructure/publication-completion.ts';
export function createFoxyPublicationCompletion(options: Omit<Parameters<typeof createFoxyPublicationCompletionAdapter>[0], 'assets'>) { return createFoxyPublicationCompletionAdapter({ ...options, assets: createFoxyPrivateAssetReadRepository() }); }
import { createFoxyPublicationConfirmationRepository as createFoxyPublicationConfirmationRepositoryAdapter } from '../modules/foxy/publications/infrastructure/publication-confirmation-repository.ts';
export function createFoxyPublicationConfirmationRepository(options: Omit<Parameters<typeof createFoxyPublicationConfirmationRepositoryAdapter>[0], 'assets'>) { return createFoxyPublicationConfirmationRepositoryAdapter({ ...options, assets: createFoxyPrivateAssetReadRepository() }); }
import { createFoxyPublicationFileAllocator as createFoxyPublicationFileAllocatorAdapter } from '../modules/foxy/publications/infrastructure/publication-file-allocator.ts';
export function createFoxyPublicationFileAllocator(options: Omit<Parameters<typeof createFoxyPublicationFileAllocatorAdapter>[0], 'assets'>) { return createFoxyPublicationFileAllocatorAdapter({ ...options, assets: createFoxyPrivateAssetReadRepository() }); }
import { createFoxyPublicationFileReader as createFoxyPublicationFileReaderAdapter } from '../modules/foxy/publications/infrastructure/publication-file-reader.ts';
export function createFoxyPublicationFileReader(options: Omit<Parameters<typeof createFoxyPublicationFileReaderAdapter>[0], 'assets'>) { return createFoxyPublicationFileReaderAdapter({ ...options, assets: createFoxyPrivateAssetReadRepository() }); }
import { createFoxyPublicationManagementRepository as createFoxyPublicationManagementRepositoryAdapter } from '../modules/foxy/publications/infrastructure/publication-management-repository.ts';
export function createFoxyPublicationManagementRepository(options: Omit<Parameters<typeof createFoxyPublicationManagementRepositoryAdapter>[0], 'assets'> = {}) { return createFoxyPublicationManagementRepositoryAdapter({ ...options, assets: createFoxyPrivateAssetReadRepository() }); }
import { inspectFoxyPublicationManagement as inspectFoxyPublicationManagementAdapter } from '../modules/foxy/publications/infrastructure/publication-management-inspect.ts';
export function inspectFoxyPublicationManagement(...args: Parameters<typeof inspectFoxyPublicationManagementAdapter> extends [...infer Args, unknown] ? Args : never) { return inspectFoxyPublicationManagementAdapter(...args, createFoxyPrivateAssetReadRepository()); }
import { retryFoxyPublication as retryFoxyPublicationAdapter } from '../modules/foxy/publications/infrastructure/publication-management-retry.ts';
export function retryFoxyPublication(...args: Parameters<typeof retryFoxyPublicationAdapter> extends [...infer Args, unknown] ? Args : never) { return retryFoxyPublicationAdapter(...args, createFoxyPrivateAssetReadRepository()); }
