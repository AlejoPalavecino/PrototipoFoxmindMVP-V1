import type { createFoxyChatController } from './foxy-chat-controller.ts';
import type { createFoxyWorkspaceActions } from '../workspace/foxy-workspace-actions.ts';
export type FoxyChatState = ReturnType<ReturnType<typeof createFoxyChatController>['getState']>;
export type FoxyChatActions = ReturnType<typeof createFoxyWorkspaceActions>['chat'];
