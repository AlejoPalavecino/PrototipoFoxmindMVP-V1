import type { ActivityGenerationCatalog, ActivityGenerationView, ActivityGenerationApplied } from '../../../../../../src/core/domain/index.ts';
export interface ActivityAiServicePort {
 sources(request: unknown, classroomId: string): Promise<ActivityGenerationCatalog>;
 list(request: unknown, classroomId: string): Promise<{ jobs: ActivityGenerationView[] }>;
 start(request: unknown, classroomId: string, input: unknown): Promise<{ created: boolean; view: ActivityGenerationView }>;
 get(request: unknown, classroomId: string, id: string): Promise<ActivityGenerationView>;
 regenerate(request: unknown, classroomId: string, id: string, input: unknown): Promise<{ created: boolean; view: ActivityGenerationView }>;
 apply(request: unknown, classroomId: string, id: string, input: unknown): Promise<ActivityGenerationApplied>;
}
