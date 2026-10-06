import { GraduationCap, User, Copy, Clock, Check, CheckCircle2, ArrowRight, X } from 'lucide-react';
import type { ClassroomInvitationData } from '../../types';

interface ClassroomInvitationCardProps {
  invitation: ClassroomInvitationData;
  isMe: boolean;
  effectiveRole: 'docente' | 'alumno';
  onCopy: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onNavigate: () => void;
}

export function ClassroomInvitationCard({ invitation, isMe, effectiveRole, onCopy, onAccept, onDecline, onNavigate }: ClassroomInvitationCardProps) {
  return (
    <div className={`mt-3.5 rounded-2xl overflow-hidden border shadow-sm ${
      isMe
        ? 'bg-black/20 border-white/25 text-white'
        : 'bg-fox-surface border-fox-border text-fox-text-main'
    }`}>
      {/* Card Header with gradient / classroom color */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isMe 
          ? 'bg-white/10 border-white/15' 
          : 'bg-gradient-to-r from-fox-primary/10 via-fox-purple/10 to-transparent border-fox-border'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
            invitation.color || 'bg-fox-purple'
          }`}>
            <GraduationCap size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block truncate">
              Invitación a Aula Virtual
            </span>
            <h4 className="text-sm font-bold truncate">
              {invitation.subject}
            </h4>
          </div>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl shrink-0 ${
          isMe ? 'bg-white/20 text-white' : 'bg-fox-primary/15 text-fox-primary border border-fox-primary/20'
        }`}>
          {invitation.course}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2.5">
        {invitation.description && (
          <p className={`text-xs leading-relaxed ${
            isMe ? 'text-white/90' : 'text-fox-text-muted'
          }`}>
            {invitation.description}
          </p>
        )}

        {/* Metadata chips: Teacher & Code */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl text-xs ${
          isMe ? 'bg-black/20' : 'bg-fox-bg/80 border border-fox-border/60'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <User size={13} className="shrink-0 opacity-70" />
            <span className="truncate"><strong>Docente:</strong> {invitation.teacherName}</span>
          </div>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
              <span className="opacity-70">Código:</span>
              <span className={`px-1.5 py-0.5 rounded ${
                isMe ? 'bg-white/20' : 'bg-fox-primary/10 text-fox-primary'
              }`}>
                {invitation.code}
              </span>
            </div>
            <button
              onClick={onCopy}
              className={`p-1 rounded-lg transition-colors ${
                isMe ? 'hover:bg-white/20' : 'hover:bg-fox-border text-fox-text-muted hover:text-fox-text-main'
              }`}
              title="Copiar código de aula"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        {/* Schedule info if available */}
        {invitation.schedule && invitation.schedule.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] opacity-80">
            <Clock size={12} className="shrink-0 text-fox-orange" />
            <span className="truncate">Horario: {invitation.schedule.join(' • ')}</span>
          </div>
        )}

        {/* Action Buttons according to status and role */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-fox-border/40">
          {invitation.status === 'pending' ? (
            effectiveRole === 'alumno' ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={onAccept}
                  className="flex-1 py-2 px-3 rounded-xl bg-fox-primary hover:bg-fox-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                >
                  <Check size={14} /> Aceptar e Ingresar
                </button>
                <button
                  onClick={onDecline}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                    isMe 
                      ? 'hover:bg-white/20 text-white/80' 
                      : 'hover:bg-fox-bg text-fox-text-muted hover:text-fox-text-main border border-fox-border'
                  }`}
                >
                  Declinar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full text-xs">
                <span className="flex items-center gap-1.5 text-fox-orange font-semibold text-[11px]">
                  <Clock size={13} /> Invitación enviada • Esperando aceptación
                </span>
                <span className="text-[10px] text-fox-text-muted font-mono">
                  {invitation.code}
                </span>
              </div>
            )
          ) : invitation.status === 'accepted' ? (
            <div className="flex items-center justify-between w-full gap-2">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                <CheckCircle2 size={15} /> Invitación Aceptada
              </span>
              <button
                onClick={onNavigate}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                Ir al Aula <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div className="w-full text-xs text-fox-text-muted flex items-center gap-1.5">
              <X size={14} className="text-red-500" /> Invitación declinada por el estudiante
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
