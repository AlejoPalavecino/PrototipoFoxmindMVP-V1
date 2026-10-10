import type { ClassroomNavigationParams } from '../features/classrooms';

export type AppView =
  | 'dashboard'
  | 'agenda'
  | 'aulas'
  | 'progreso'
  | 'copiloto'
  | 'mensajes'
  | 'config'
  | 'estudia'
  | '';

export type ParamsByView = {
  dashboard: undefined;
  agenda: undefined;
  aulas: ClassroomNavigationParams;
  progreso: undefined;
  copiloto: { initialPrompt: string };
  mensajes: { conversationId?: string; contactId?: string };
  config: undefined;
  estudia: undefined;
  '': undefined;
};

// Infer the destination only from view, never from its payload.
export type SetAppView = <V extends AppView>(
  view: V,
  params?: ParamsByView[NoInfer<V>],
  mode?: 'push' | 'replace',
) => void;

// Readers retain the optional fields they already consume across destinations.
export interface StoredNavigationParams extends ClassroomNavigationParams {
  initialPrompt?: string;
  conversationId?: string;
  contactId?: string;
}
