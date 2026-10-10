import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Classroom } from '../model/Classroom';
import { classroomRepository } from '../data/inMemoryClassroomRepository';
import { joinClassroomByCode } from '../application/classroomMembership';
import { createClassroomJoinState, type ClassroomJoinOperation } from '../application/classroomJoinState';
import { messagingStore } from '../../messaging/messagingStore';
import { toast } from '../../../components/ui/Toaster';

// Page lifetime: closing the dialog or selecting detail must not reset its code.
export function useStudentClassroomMembership(joinOperation: ClassroomJoinOperation = joinClassroomByCode) {
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => [...classroomRepository.readMembership()]);
  const [isJoinModalOpen, updateIsJoinModalOpen] = useState(false);
  const [invitationCode, updateInvitationCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const gateRef = useRef<ReturnType<typeof createClassroomJoinState> | null>(null);
  if (!gateRef.current) gateRef.current = createClassroomJoinState();
  const gate = gateRef.current;
  const active = useRef(true);
  const draft = useRef({ open: isJoinModalOpen, code: invitationCode });

  // Synchronize classrooms with session membership on mount and on messagingStore updates.
  useEffect(() => {
    active.current = true;
    setClassrooms([...classroomRepository.readMembership()]);
    const unsubscribe = messagingStore.subscribe(() => {
      setClassrooms([...classroomRepository.readMembership()]);
    });
    return () => {
      active.current = false;
      gate.invalidate(); // Late confirmations must not touch an unmounted/new dialog.
      unsubscribe();
    };
  }, []);

  // Keep the old setter API (including functional updates), but block conflicting edits immediately.
  const setIsJoinModalOpen: Dispatch<SetStateAction<boolean>> = next => {
    if (!active.current || !gate.edit()) return;
    const value = typeof next === 'function' ? next(draft.current.open) : next;
    draft.current.open = value;
    updateIsJoinModalOpen(value);
    setJoinError(null);
  };
  const setInvitationCode: Dispatch<SetStateAction<string>> = next => {
    if (!active.current || !gate.edit()) return;
    const value = typeof next === 'function' ? next(draft.current.code) : next;
    draft.current.code = value;
    updateInvitationCode(value);
    setJoinError(null);
  };

  const handleJoinClassroom = () => {
    if (!active.current || !draft.current.open) return Promise.resolve({ status: 'ignored' as const });
    return gate.join(draft.current.code, classrooms, joinOperation, {
      onPendingChange: pending => {
        setIsJoining(pending);
        if (pending) setJoinError(null);
      },
      onError: setJoinError,
      onConfirmed: result => {
        const aula = result.classroom;
        if (result.status === 'duplicate') {
          toast.show(`Ya estás matriculado en ${aula.subject} (${aula.course})`, 'info');
        } else {
          const refreshed = [...classroomRepository.readMembership()];
          toast.show(result.status === 'catalogue'
            ? `🎉 ¡Te has unido exitosamente al aula de ${aula.subject} (${aula.course})!`
            : `🎉 Te has unido al aula de ${aula.subject} (${aula.course}) mediante tu código de acceso`, 'success');
          setClassrooms(refreshed);
        }
        draft.current = { open: false, code: '' };
        updateIsJoinModalOpen(false);
        updateInvitationCode('');
        setJoinError(null);
      },
    });
  };

  return { classrooms, isJoinModalOpen, setIsJoinModalOpen, invitationCode, setInvitationCode, handleJoinClassroom, isJoining, joinError };
}

// Additional UI fields are optional for compatibility with existing controller consumers.
export type StudentClassroomMembershipController = Omit<ReturnType<typeof useStudentClassroomMembership>, 'isJoining' | 'joinError'> & {
  isJoining?: boolean;
  joinError?: string | null;
};
