export type AccountView = 'sign-in' | 'register' | 'verify-email' | 'forgot-password' | 'recover-password' | 'profile' | 'settings';
export type AccountEntryView = Exclude<AccountView, 'profile' | 'settings'>;
export const accountContent: Record<AccountView, { title: string; description: string }> = {
  'sign-in': { title: 'Volvé a tu espacio', description: 'Ingresá con el correo de tu cuenta.' },
  register: { title: 'Creá tu cuenta', description: 'Te va a llevar menos de un minuto.' },
  'verify-email': { title: 'Verificá tu correo', description: 'La verificación habilita el acceso a tus aulas.' },
  'forgot-password': { title: 'Recuperá tu acceso', description: 'Ingresá el correo con el que creaste tu cuenta.' },
  'recover-password': { title: 'Nueva contraseña', description: 'Restablecé tu acceso con el enlace que recibiste por correo. Vence a los 15 minutos y se usa una sola vez.' },
  profile: { title: 'Mi perfil', description: 'Revisá tus datos y elegí cómo aparece tu nombre en las aulas.' },
  settings: { title: 'Configuración de la cuenta', description: 'Administrá tu contraseña y el acceso a tu cuenta.' },
};

/** Decorative Expedición scene per entry view: painted landscape and the guide's line. */
export const accountScene: Record<AccountEntryView, { scene: 'sunset' | 'river'; guide: string }> = {
  'sign-in': { scene: 'sunset', guide: '¡Qué bueno verte de nuevo!' },
  register: { scene: 'river', guide: '¡Arranquemos! Vamos de a un paso.' },
  'verify-email': { scene: 'river', guide: 'Ya casi. Falta confirmar tu correo.' },
  'forgot-password': { scene: 'sunset', guide: 'Tranqui, lo resolvemos juntos.' },
  'recover-password': { scene: 'sunset', guide: 'Elegí una contraseña nueva y seguimos.' },
};
