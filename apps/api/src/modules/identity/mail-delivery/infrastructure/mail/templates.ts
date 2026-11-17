type Purpose = "verification" | "recovery";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]!);

export function accountMessage(purpose: Purpose, appOrigin: string, token: string) {
  const verification = purpose === "verification";
  const link = `${appOrigin}${verification ? "/verify-email" : "/recover-password"}#token=${token}`;
  const subject = verification ? "Verifica tu correo en FoxMind" : "Recupera tu acceso a FoxMind";
  const instruction = verification ? "Confirma tu correo para usar FoxMind." : "Elige una nueva contraseña para recuperar tu acceso a FoxMind.";
  const lifetime = verification ? "Este enlace vence en 1 hora." : "Este enlace vence en 15 minutos.";
  const notice = "Si no solicitaste este mensaje, puedes ignorarlo.";
  return {
    subject,
    text: `${instruction}\n\n${link}\n\n${lifetime}\n${notice}`,
    html: `<!doctype html><html lang="es"><body><h1>${subject}</h1><p>${instruction}</p><p><a href="${escapeHtml(link)}">${verification ? "Verificar mi correo" : "Recuperar mi acceso"}</a></p><p>${lifetime}</p><p>${notice}</p></body></html>`,
  };
}
