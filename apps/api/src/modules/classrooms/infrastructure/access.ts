import type { ClassroomAccess, PreviewTokenPort } from '../application/ports.ts';
import type { ClassroomPorts } from './contracts.ts';
/** Composition-only context: services depend on structural capabilities, never the concrete runner. */
export interface ClassroomRuntimeAccess extends ClassroomAccess { ports: ClassroomPorts; tokens: PreviewTokenPort }
