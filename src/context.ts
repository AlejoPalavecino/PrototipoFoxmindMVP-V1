import React from 'react';
import { Role } from './types';

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
  view: string;
  navigationParams?: any;
  settings: AppSettings;
  setRole: (role: Role) => void;
  setView: (view: string, params?: any) => void;
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
