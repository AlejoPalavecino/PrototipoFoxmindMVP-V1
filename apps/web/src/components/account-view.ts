export type AccountView = 'sign-in' | 'register' | 'verify-email' | 'forgot-password' | 'recover-password' | 'profile' | 'settings';
export const accountContent: Record<AccountView, { title: string; description: string }> = {
  'sign-in': { title: 'Volvé a tu espacio', description: 'Ingresá para continuar con tus aulas.' },
  register: { title: 'Creá tu cuenta', description: 'Elegí el espacio que vas a usar en FoxMind.' },
  'verify-email': { title: 'Verificá tu correo', description: 'La verificación habilita el acceso a tus aulas.' },
  'forgot-password': { title: 'Recuperá tu acceso', description: 'Ingresá el correo con el que creaste tu cuenta.' },
  'recover-password': { title: 'Nueva contraseña', description: 'Restablecé tu acceso con el enlace que recibiste por correo. Vence a los 15 minutos y se utiliza una sola vez.' },
  profile: { title: 'Mi perfil', description: 'Revisá tus datos y elegí cómo aparece tu nombre en las aulas.' },
  settings: { title: 'Configuración de la cuenta', description: 'Administrá tu contraseña y el acceso a tu cuenta.' },
};
