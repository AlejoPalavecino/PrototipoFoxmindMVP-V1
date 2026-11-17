import type { FoxyPublicationManagement } from '../../../../../../../../src/core/domain/foxy/resource.ts';
// Keep domain compile-only assertions in the same strict build, without a runtime import.
import type {} from "../../../../../../../../src/core/domain/foxy/tests/foxy-publication-types.test.ts";
import type { createFoxyPublicationManagementRepository } from "../../../../../bootstrap/foxy-service-factories.ts";
import type { createFoxyPublicationManagementService } from "../../../publications/public.ts";

type RepositoryView = Awaited<ReturnType<ReturnType<typeof createFoxyPublicationManagementRepository>['inspect']>>;
type ServiceView = Awaited<ReturnType<ReturnType<typeof createFoxyPublicationManagementService>['inspect']>>;
declare const repositoryView: RepositoryView;
declare const serviceView: ServiceView;
const repositoryContract: FoxyPublicationManagement = repositoryView;
const serviceContract: FoxyPublicationManagement = serviceView;
const cleanup: 'NOT_REQUESTED' | 'PENDING' | 'FAILED' | 'DONE' = serviceView.cleanupState;
void repositoryContract; void serviceContract; void cleanup;
