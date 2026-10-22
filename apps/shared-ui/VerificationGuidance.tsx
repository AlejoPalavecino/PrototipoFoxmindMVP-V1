export function VerificationGuidance({ confirmed }: { confirmed: boolean }) {
  return <p>{confirmed
    ? 'Inicia sesión para continuar con tu cuenta verificada.'
    : 'Abre el enlace original del correo para verificar tu cuenta. Si necesitas un nuevo mensaje, inicia sesión y solicita el reenvío.'}</p>;
}
