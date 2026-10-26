export type AccountView = 'sign-in' | 'register' | 'verify-email' | 'forgot-password' | 'recover-password' | 'profile' | 'settings';
export const accountContent: Record<AccountView, { title: string; description: string }> = {
  'sign-in': { title: '¡Hola de nuevo!', description: 'Entrá para seguir con tus aulas.' },
  register: { title: 'Creá tu cuenta', description: 'Tu próximo paso empieza acá.' },
  'verify-email': { title: 'Verifica tu correo', description: 'Confirma tu dirección para empezar a usar FoxMind.' },
  'forgot-password': { title: 'Recupera tu acceso', description: 'Te enviaremos las instrucciones para crear una nueva contraseña.' },
  'recover-password': { title: 'Crea una nueva contraseña', description: 'El enlace de recuperación es válido durante 15 minutos y se utiliza una sola vez.' },
  profile: { title: 'Mi perfil', description: 'Tus datos, siempre a mano.' },
  settings: { title: 'Configuración', description: 'Tu cuenta y seguridad, en un solo lugar.' },
};
