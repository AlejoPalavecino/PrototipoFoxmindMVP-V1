import { parseHomeTarget } from '../../../../../src/core/domain/home/target.ts';
import { type HomeTarget } from '../../../../../src/core/domain/home/home.ts';

const invitationId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
type ClassroomHomeTarget = Exclude<HomeTarget, { kind: 'private-event' }>;

export function classroomHomeHref({ classroomId, kind, ...fields }: ClassroomHomeTarget): string {
  return `/mis-aulas?${new URLSearchParams({ aula: classroomId, destino: kind, ...fields })}`;
}

export function classroomHomeDestination(value: string): ClassroomHomeTarget | null {
  if (!value.startsWith('/mis-aulas?aula=') || value.length > 350) return null;
  const { aula, destino, ...fields } = Object.fromEntries(new URLSearchParams(value.slice('/mis-aulas?'.length)));
  if (!destino) return null;
  try {
    const target = parseHomeTarget({ ...fields, kind: destino, classroomId: aula });
    return target.kind !== 'private-event' && classroomHomeHref(target) === value ? target : null;
  } catch { return null; }
}

/** Only these literal local product destinations can cross an account flow. */
export function safeDestination(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || value.length > 350) return null;
  if (value === '/mis-aulas' || value === '/inicio' || value === '/agenda' || value === '/settings' || value === '/foxy-ai' || value === '/notificaciones') return value;
  if(value==='/carpetas-de-estudio')return value;
  const study=/^\/carpetas-de-estudio\/([^/?#]+)$/u.exec(value);
  if(study&&invitationId.test(study[1]))return value;
  const target = /^\/mis-aulas\?aula=([^&?#]+)(?:&actividad=([^&?#]+))?$/.exec(value);
  if (target && invitationId.test(target[1]) && (!target[2] || invitationId.test(target[2]))) return value;
  if (classroomHomeDestination(value)) return value;
  const notification = /^\/mis-aulas\?notificacion=([^&?#]+)$/.exec(value);
  if (notification && invitationId.test(notification[1])) return value;
  const match = /^\/mis-aulas\?invitacion=([^&?#]+)$/.exec(value);
  return match && invitationId.test(match[1]) ? `/mis-aulas?invitacion=${match[1]}` : null;
}
export function authHref(view: 'sign-in' | 'verify-email' | 'register', destination: string | null): string {
  const safe = safeDestination(destination ?? undefined);
  return `/${view}${safe ? `?next=${encodeURIComponent(safe)}` : ''}`;
}
