export function VerificationGuidance({ confirmed }: { confirmed: boolean }) {
  return <p>{confirmed
    ? 'Iniciá sesión para continuar con tu cuenta verificada.'
    : 'Abrí el enlace original del correo para verificar tu cuenta. Si necesitás un mensaje nuevo, iniciá sesión y pedí el reenvío.'}</p>;
}
