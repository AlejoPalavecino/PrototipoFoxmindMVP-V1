import type { FoxyPublicationManagement } from '../../../../src/core/domain/index.ts';
import type { createFoxyPublicationManagementRepository } from './publication-management-repository.ts';
import type { createFoxyPublicationManagementService } from './publication-management-service.ts';

type RepositoryView = Awaited<ReturnType<ReturnType<typeof createFoxyPublicationManagementRepository>['inspect']>>;
type ServiceView = Awaited<ReturnType<ReturnType<typeof createFoxyPublicationManagementService>['inspect']>>;
declare const repositoryView: RepositoryView;
declare const serviceView: ServiceView;
const repositoryContract: FoxyPublicationManagement = repositoryView;
const serviceContract: FoxyPublicationManagement = serviceView;
const cleanup: 'NOT_REQUESTED' | 'PENDING' | 'FAILED' | 'DONE' = serviceView.cleanupState;
void repositoryContract; void serviceContract; void cleanup;
