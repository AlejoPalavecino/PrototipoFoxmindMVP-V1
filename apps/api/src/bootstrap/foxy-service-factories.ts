import { createFoxyVisualService as visual } from '../modules/foxy/application/visual-service.ts';
import { activeClassroom } from '../modules/foxy/infrastructure/turn-authority.ts';
import { createHash } from 'node:crypto';
import { createFoxyConversationService as conversation } from '../modules/foxy/application/conversation-service.ts';
import { createFoxyTurnService as turn } from '../modules/foxy/application/turn-service.ts';
import { createFoxyResourceService as resource } from '../modules/foxy/application/resource-service.ts';
import { createFoxyCitationService as citation } from '../modules/foxy/application/citation-service.ts';
import { ownedRoom, activeRoom } from '../modules/foxy/infrastructure/turn-authority.ts';
import { rebuildGrounding, assertFoxyFileQuota } from '../modules/foxy/infrastructure/grounding-rebuild.ts';
import { prepareFoxyActivity as prepareActivity } from '../modules/foxy/infrastructure/activity-handoff.ts';
import { createActivityDraftInTransaction } from '../modules/activities/infrastructure/activity-draft.ts';
import { createCitationFileReader } from '../modules/foxy/infrastructure/citation-read.ts';
import { mapFoxyCitations } from '../modules/foxy/infrastructure/citation-mapping.ts';
import { loadCitationTurn, citationDocument, textActivity } from '../modules/foxy/infrastructure/citation-repository.ts';
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export function createFoxyConversationService(options: Omit<Parameters<typeof conversation>[0], 'digest'>) { return conversation({ ...options, digest }); }
export function createFoxyTurnService(options: Omit<Parameters<typeof turn>[0], 'digest' | 'authority' | 'rebuildGrounding'>) {
 return turn({ ...options, digest, authority: { ownedRoom, activeRoom }, rebuildGrounding, checkFileQuota: assertFoxyFileQuota });
}
export function createFoxyResourceService(options: Omit<Parameters<typeof resource>[0], 'prepareActivity'>) { return resource({ ...options, prepareActivity: prepareFoxyActivity }); }
export function createFoxyCitationService(options: { uow: Parameters<typeof citation>[0]['uow']; files: unknown }) {
 const readFile = createCitationFileReader(options);
 return citation({ uow: options.uow, readFile, citations: { loadTurn: loadCitationTurn, document: citationDocument, map: mapFoxyCitations, textActivity, readFile } });
}

export function prepareFoxyActivity(...args: Parameters<Parameters<typeof resource>[0]['prepareActivity']>) { return prepareActivity(...args,createActivityDraftInTransaction); }

export function createFoxyVisualService(options: Omit<Parameters<typeof visual>[0], 'activeClassroom' | 'rebuildGrounding'>) { return visual({ ...options, activeClassroom, rebuildGrounding, checkFileQuota: assertFoxyFileQuota }); }
