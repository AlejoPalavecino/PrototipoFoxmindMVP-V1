import React, { useState, useEffect } from 'react';
import { classroomRepository, joinClassroomByCode } from '../../features/classrooms';
import { StudentClassroomDetail, StudentClassroomList } from '../../features/classrooms/ui';
import type { Classroom } from '../../features/classrooms';
import { messagingStore } from '../../features/messaging/messagingStore';
import { Plus, X } from 'lucide-react';
import { toast } from '../../components/ui/Toaster';
import { useAppContext } from '../../context';
import { motion, AnimatePresence } from 'motion/react';

export function AulasAlumno() {
  const { navigationParams, setView } = useAppContext();
  const [selectedAula, setSelectedAula] = useState<Classroom | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => [...classroomRepository.readMembership()]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');

  // Synchronize classrooms with session membership on mount and on messagingStore updates
  useEffect(() => {
    setClassrooms([...classroomRepository.readMembership()]);
    const unsubscribe = messagingStore.subscribe(() => {
      setClassrooms([...classroomRepository.readMembership()]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (navigationParams?.aulaId) {
      const aula = classrooms.find(a => a.id === navigationParams.aulaId);
      if (aula) {
        setSelectedAula(aula);
      }
    }
  }, [navigationParams, classrooms]);

  const handleBack = () => {
    setSelectedAula(null);
    if (navigationParams?.aulaId) {
      setView('aulas', undefined);
    }
  };

  const handleJoinClassroom = () => {
    const result = joinClassroomByCode(invitationCode, classrooms);
    if (result.status === 'rejected') return;
    const aula = result.classroom;
    if (result.status === 'duplicate') {
      toast.show(`Ya estás matriculado en ${aula.subject} (${aula.course})`, 'info');
      setIsJoinModalOpen(false);
      setInvitationCode('');
      return;
    }

    setClassrooms([...classroomRepository.readMembership()]);
    setIsJoinModalOpen(false);
    setInvitationCode('');
    if (result.status === 'catalogue') {
      toast.show(`🎉 ¡Te has unido exitosamente al aula de ${aula.subject} (${aula.course})!`, 'success');
      return;
    }
    toast.show(`🎉 Te has unido al aula de ${aula.subject} (${aula.course}) mediante tu código de acceso`, 'success');
  };

  return (
    <div className={`flex-1 flex flex-col ${!selectedAula ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-8' : ''}`}>
      <AnimatePresence mode="wait">
        {!selectedAula ? (
          <StudentClassroomList classrooms={classrooms} onSelect={setSelectedAula} onJoin={() => setIsJoinModalOpen(true)} />
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 flex flex-col bg-fox-surface w-full h-full rounded-3xl overflow-hidden shadow-xs border border-fox-border mb-6"
          >
            <StudentClassroomDetail aula={selectedAula} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Unirse a un aula */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-fox-border"
            >
              <div className="p-6 border-b border-fox-border bg-fox-surface flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-fox-primary"></div>
                <h3 className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                  <Plus size={22} className="text-fox-primary" /> Unirse a un Aula
                </h3>
                <button 
                  onClick={() => setIsJoinModalOpen(false)} 
                  className="p-2 text-fox-text-muted hover:bg-fox-border/50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 bg-fox-bg/40">
                <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border">
                  <label className="text-xs font-bold uppercase tracking-wider text-fox-text-main mb-2 block">
                    Código de Invitación
                  </label>
                  <p className="text-xs text-fox-text-muted mb-3 font-medium">
                    Ingresa el código alfanumérico provisto por tu docente para matricularte.
                  </p>
                  <input 
                    type="text" 
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="Ej. LIT-2026-X"
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all font-mono font-bold text-sm text-fox-text-main"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-fox-border bg-fox-surface flex justify-end gap-3">
                <button 
                  onClick={() => setIsJoinModalOpen(false)} 
                  className="px-4 py-2 font-bold text-xs text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleJoinClassroom}
                  disabled={!invitationCode.trim()}
                  className="px-6 py-2.5 bg-fox-primary text-white font-bold text-xs rounded-xl hover:bg-fox-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  Unirme al Aula
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
