import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, X, Mail, KeyRound, Plus, UserCheck, Check, Copy, Link, Info, SendHorizontal } from 'lucide-react';
import { toast } from '../../../../components/ui/Toaster';
import type { Classroom } from '../../model/Classroom';
import type { TeacherClassroomDetailController } from '../../hooks/useTeacherClassroomDetail';

// Presentation only: invitation coordination and drafts retain detail lifetime.
export function TeacherClassroomDetailInvitation({ aula, detail }: { aula: Classroom; detail: TeacherClassroomDetailController }) {
  const {
    isInviteStudentModalOpen, setIsInviteStudentModalOpen, inviteModalTab, setInviteModalTab,
    inviteEmailInput, setInviteEmailInput, invitedEmailsList, setInvitedEmailsList,
    inviteCustomNote, setInviteCustomNote, copiedCode, setCopiedCode, copiedLink, setCopiedLink,
    handleAddInviteEmail, handleRemoveInviteEmail, handleSendEmailInvitations,
  } = detail;
  return (
      <AnimatePresence>
        {isInviteStudentModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-fox-border flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-fox-border bg-fox-surface flex justify-between items-center relative shrink-0">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-fox-primary via-fox-purple to-fox-orange"></div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
                    <GraduationCap size={24} className="text-fox-primary" /> Invitar Alumnos al Aula
                  </h3>
                  <p className="text-xs text-fox-text-muted mt-0.5">
                    {aula.subject} • {aula.course}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsInviteStudentModalOpen(false);
                    setInviteEmailInput('');
                    setInvitedEmailsList([]);
                    setInviteCustomNote('');
                  }}
                  className="p-2 text-fox-text-muted hover:bg-fox-border/50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="px-6 pt-4 pb-2 bg-fox-bg/40 border-b border-fox-border shrink-0">
                <div className="grid grid-cols-2 p-1 bg-fox-surface rounded-2xl border border-fox-border shadow-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setInviteModalTab('email')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inviteModalTab === 'email'
                        ? 'bg-fox-primary text-white shadow-sm'
                        : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg/60'
                    }`}
                  >
                    <Mail size={15} /> Por Correo de Plataforma
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteModalTab('code')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inviteModalTab === 'code'
                        ? 'bg-fox-primary text-white shadow-sm'
                        : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg/60'
                    }`}
                  >
                    <KeyRound size={15} /> Código de Acceso
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 bg-fox-bg/40 overflow-y-auto flex-1">
                {inviteModalTab === 'email' ? (
                  /* TAB 1: EMAIL INVITATION */
                  <div className="space-y-4">
                    {/* Method Info Banner */}
                    <div className="p-3.5 rounded-2xl bg-fox-primary/10 border border-fox-primary/20 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-fox-primary/15 text-fox-primary shrink-0 mt-0.5">
                        <Mail size={16} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-fox-text-main">Invitación directa por correo institucional</h4>
                        <p className="text-fox-text-muted mt-0.5 leading-relaxed text-[11px]">
                          Ingresa el correo de los alumnos registrados en la plataforma. Recibirán una tarjeta interactiva en su bandeja de mensajes de FoxMind para unirse con 1 clic.
                        </p>
                      </div>
                    </div>

                    {/* Email Input with Add Button */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted block">
                        Correo electrónico del alumno
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
                          <input
                            type="email"
                            value={inviteEmailInput}
                            onChange={(e) => setInviteEmailInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddInviteEmail();
                              }
                            }}
                            placeholder="ej: alumno@escuela.edu.ar (o varios separados por coma)"
                            className="w-full bg-fox-surface border border-fox-border rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all text-xs font-medium text-fox-text-main shadow-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddInviteEmail()}
                          disabled={!inviteEmailInput.trim()}
                          className="px-3.5 py-2.5 bg-fox-primary/10 hover:bg-fox-primary/20 text-fox-primary font-bold text-xs rounded-xl border border-fox-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus size={15} /> Agregar
                        </button>
                      </div>
                      <p className="text-[11px] text-fox-text-muted">
                        Presiona <span className="font-mono font-bold bg-fox-surface px-1 py-0.5 rounded border border-fox-border">Enter</span> o <span className="font-mono font-bold bg-fox-surface px-1 py-0.5 rounded border border-fox-border">,</span> para añadir varios destinatarios.
                      </p>
                    </div>

                    {/* Invited Emails Chips Container */}
                    {invitedEmailsList.length > 0 && (
                      <div className="bg-fox-surface p-3.5 rounded-2xl border border-fox-border space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-fox-text-main flex items-center gap-1.5">
                            <UserCheck size={14} className="text-fox-primary" />
                            Alumnos a invitar ({invitedEmailsList.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setInvitedEmailsList([])}
                            className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Limpiar lista
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                          {invitedEmailsList.map(email => (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fox-primary/10 border border-fox-primary/20 text-fox-primary font-medium text-xs shadow-2xs"
                            >
                              <span className="truncate max-w-[200px]">{email}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveInviteEmail(email)}
                                className="hover:bg-fox-primary/20 rounded p-0.5 transition-colors cursor-pointer text-fox-primary/70 hover:text-fox-primary"
                                title="Eliminar"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Message */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted block">
                        Mensaje personalizado (opcional)
                      </label>
                      <textarea
                        value={inviteCustomNote}
                        onChange={e => setInviteCustomNote(e.target.value)}
                        placeholder={`Hola, te invito a sumarte a nuestra aula virtual de ${aula.subject} (${aula.course}) para acceder a las consignas, materiales y seguimiento pedagógico...`}
                        rows={2}
                        className="w-full bg-fox-surface border border-fox-border rounded-xl p-3 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary resize-none font-medium shadow-xs"
                      />
                    </div>
                  </div>
                ) : (
                  /* TAB 2: ACCESS CODE */
                  <div className="space-y-4">
                    {/* Method Info Banner */}
                    <div className="p-3.5 rounded-2xl bg-fox-purple/10 border border-fox-purple/20 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-fox-purple/15 text-fox-purple shrink-0 mt-0.5">
                        <KeyRound size={16} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-fox-text-main">Matriculación particular del alumno</h4>
                        <p className="text-fox-text-muted mt-0.5 leading-relaxed text-[11px]">
                          Comparte este código o enlace con tus estudiantes para que ellos mismos se unan de forma autónoma desde su cuenta.
                        </p>
                      </div>
                    </div>

                    {/* Class Code Card */}
                    <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted">
                          Código de Inscripción al Aula
                        </label>
                        <span className="text-[11px] text-fox-primary font-bold">Ciclo lectivo 2026</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-4 py-3 font-mono font-black text-center text-fox-primary text-lg tracking-widest shadow-inner">
                          {`${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`}
                        </div>
                        <button
                          onClick={() => {
                            const code = `${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;
                            navigator.clipboard.writeText(code);
                            setCopiedCode(true);
                            toast.show('📋 Código copiado al portapapeles', 'info');
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-4 py-3 bg-fox-primary text-white font-bold text-xs rounded-xl hover:bg-fox-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                        >
                          {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                          <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Direct URL Card */}
                    <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border shadow-xs space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted flex items-center gap-1.5">
                        <Link size={13} className="text-fox-text-muted" /> Enlace directo de invitación
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`https://foxmind.app/unirse?code=${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`}
                          className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-3.5 py-2.5 text-xs text-fox-text-muted font-mono select-all outline-none"
                        />
                        <button
                          onClick={() => {
                            const url = `https://foxmind.app/unirse?code=${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;
                            navigator.clipboard.writeText(url);
                            setCopiedLink(true);
                            toast.show('🔗 Enlace copiado al portapapeles', 'info');
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="px-3.5 py-2.5 bg-fox-purple/10 hover:bg-fox-purple/20 text-fox-purple font-bold text-xs rounded-xl border border-fox-purple/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                          <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step by step guide */}
                    <div className="bg-fox-surface/80 p-4 rounded-2xl border border-fox-border space-y-2">
                      <h5 className="text-xs font-bold text-fox-text-main flex items-center gap-1.5">
                        <Info size={14} className="text-fox-primary" /> ¿Cómo se suma el alumno?
                      </h5>
                      <ol className="text-xs text-fox-text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                        <li>El alumno ingresa a FoxMind con su cuenta personal.</li>
                        <li>En el menú lateral abre <strong>Mis Aulas</strong> y presiona <strong>"Unirse a un Aula"</strong>.</li>
                        <li>Ingresa este código de acceso y queda matriculado automáticamente.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-fox-border bg-fox-surface flex justify-between items-center shrink-0">
                <span className="text-xs text-fox-text-muted font-medium">
                  {inviteModalTab === 'email'
                    ? `${invitedEmailsList.length + (inviteEmailInput.trim() ? 1 : 0)} destinatario(s) preparado(s)`
                    : 'Código válido para el ciclo 2026'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsInviteStudentModalOpen(false);
                      setInviteEmailInput('');
                      setInvitedEmailsList([]);
                      setInviteCustomNote('');
                    }}
                    className="px-4 py-2.5 font-bold text-xs text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors cursor-pointer"
                  >
                    {inviteModalTab === 'email' ? 'Cancelar' : 'Cerrar'}
                  </button>

                  {inviteModalTab === 'email' ? (
                    <button
                      onClick={handleSendEmailInvitations}
                      disabled={invitedEmailsList.length === 0 && !inviteEmailInput.trim()}
                      className={`px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                        invitedEmailsList.length > 0 || inviteEmailInput.trim()
                          ? 'bg-fox-primary text-white hover:bg-fox-primary/90 active:scale-98'
                          : 'bg-fox-border text-fox-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      <SendHorizontal size={14} /> Enviar Invitación{invitedEmailsList.length > 1 ? 'es' : ''}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const code = `${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;
                        navigator.clipboard.writeText(code);
                        toast.show('📋 Código copiado al portapapeles', 'success');
                        setIsInviteStudentModalOpen(false);
                      }}
                      className="px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 bg-fox-primary text-white hover:bg-fox-primary/90 transition-all shadow-md cursor-pointer"
                    >
                      <Copy size={14} /> Copiar y Cerrar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
