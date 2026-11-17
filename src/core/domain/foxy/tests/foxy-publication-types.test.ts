import type { FoxyPublicationState, FoxyPublicationSummary, FoxyPublicationInspection, FoxyPublicationConfirmation } from '../resource.ts';
const state: FoxyPublicationState = 'READY';
const summary: FoxyPublicationSummary = { id:'id',resourceId:'resource',resourceRevision:'0',classroomId:'room',unitId:null,topicId:null,title:'Guía',state,revision:'0' };
const inspection: FoxyPublicationInspection = { publication:summary,classroomRevision:'0',classroomArchived:false,errorCode:null };
const confirmation: FoxyPublicationConfirmation = { publicationId:'publication',materialId:'material',publicationRevision:'1',classroomRevision:'1' };
void inspection; void confirmation;
// @ts-expect-error Publication states are closed and must not admit arbitrary server strings.
const invalidState: FoxyPublicationState = 'SECRET_INTERNAL_STATE';
void invalidState;
