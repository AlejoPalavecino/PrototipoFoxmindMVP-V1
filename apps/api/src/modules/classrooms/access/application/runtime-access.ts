import type { ClassroomAccess, PreviewTokenPort } from './ports.ts';
import type { ClassroomPorts } from './runtime-ports.ts';
/** Composition-only context: services depend on structural capabilities, never the concrete runner. */
export interface ClassroomRuntimeAccess extends ClassroomAccess { ports: ClassroomPorts; tokens: PreviewTokenPort }
