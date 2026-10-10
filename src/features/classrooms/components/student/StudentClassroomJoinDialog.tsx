import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import type { StudentClassroomMembershipController } from '../../hooks/useStudentClassroomMembership';

export function StudentClassroomJoinDialog({ membership }: { membership: StudentClassroomMembershipController }) {
  const { isJoinModalOpen, setIsJoinModalOpen, invitationCode, setInvitationCode, handleJoinClassroom, isJoining = false, joinError = null } = membership;
  return (
    <>
      {/* Modal: Unirse a un aula */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-classroom-join-title"
              aria-busy={isJoining}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-fox-border"
            >
              <div className="p-6 border-b border-fox-border bg-fox-surface flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-fox-primary"></div>
                <h3 id="student-classroom-join-title" className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                  <Plus size={22} className="text-fox-primary" /> Unirse a un Aula
                </h3>
                <button
                  onClick={() => setIsJoinModalOpen(false)}
                  disabled={isJoining}
                  aria-label="Cerrar diálogo de inscripción"
                  className="p-2 text-fox-text-muted hover:bg-fox-border/50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 bg-fox-bg/40">
                <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border">
                  <label htmlFor="student-classroom-invitation-code" className="text-xs font-bold uppercase tracking-wider text-fox-text-main mb-2 block">
                    Código de Invitación
                  </label>
                  <p className="text-xs text-fox-text-muted mb-3 font-medium">
                    Ingresa el código alfanumérico provisto por tu docente para matricularte.
                  </p>
                  <input
                    id="student-classroom-invitation-code"
                    type="text"
                    disabled={isJoining}
                    aria-describedby={joinError ? 'student-classroom-join-error' : undefined}
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="Ej. LIT-2026-X"
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all font-mono font-bold text-sm text-fox-text-main"
                  />
                </div>
                {isJoining && <p role="status" aria-live="polite" className="text-sm text-fox-text-muted">Uniéndote al aula…</p>}
                {joinError && <p id="student-classroom-join-error" role="alert" className="text-sm text-red-600">{joinError}</p>}
              </div>

              <div className="p-5 border-t border-fox-border bg-fox-surface flex justify-end gap-3">
                <button
                  onClick={() => setIsJoinModalOpen(false)}
                  disabled={isJoining}
                  className="px-4 py-2 font-bold text-xs text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleJoinClassroom}
                  disabled={isJoining || !invitationCode.trim()}
                  className="px-6 py-2.5 bg-fox-primary text-white font-bold text-xs rounded-xl hover:bg-fox-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  {isJoining ? 'Uniéndote…' : joinError ? 'Reintentar inscripción' : 'Unirme al Aula'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
