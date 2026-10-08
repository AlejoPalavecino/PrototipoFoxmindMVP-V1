import React from 'react';
import { Role } from './types';
import type { AppView, SetAppView, StoredNavigationParams } from './app/navigation';

interface AppSettings {
  theme: string;
  density: string;
  fontSize: string;
  // Accessibility settings
  dyslexic: boolean;
  contrast: boolean;
  easyRead: boolean;
  textSize: string;
}

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
  settings: { 
    theme: 'light', 
    density: 'comoda', 
    fontSize: 'normal',
    dyslexic: false,
    contrast: false,
    easyRead: false,
    textSize: 'M'
  },
  setRole: () => {},
  setView: () => {},
  updateSettings: () => {},
});

export const useAppContext = () => React.useContext(AppContext);
