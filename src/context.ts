import React from 'react';
import { Role } from './types';
import type { AppView, SetAppView, StoredNavigationParams } from './app/navigation';
import { createDefaultAppSettings, type AppSettings } from './app/settings';

interface AppState {
  role: Role;
  view: AppView;
  navigationParams?: StoredNavigationParams;
  settings: AppSettings;
  setRole: (role: Role) => void;
  setView: SetAppView;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const AppContext = React.createContext<AppState>({
  role: 'none',
  view: 'dashboard',
  settings: createDefaultAppSettings(),
  setRole: () => {},
  setView: () => {},
  updateSettings: () => {},
});

export const useAppContext = () => React.useContext(AppContext);
