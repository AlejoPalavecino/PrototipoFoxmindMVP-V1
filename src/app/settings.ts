export interface AppSettings {
  theme: string;
  density: string;
  fontSize: string;
  // Accessibility settings
  dyslexic: boolean;
  contrast: boolean;
  easyRead: boolean;
  textSize: string;
}

export function createDefaultAppSettings(): AppSettings {
  return {
    theme: 'light',
    density: 'comoda',
    fontSize: 'normal',
    dyslexic: false,
    contrast: false,
    easyRead: false,
    textSize: 'M',
  };
}
