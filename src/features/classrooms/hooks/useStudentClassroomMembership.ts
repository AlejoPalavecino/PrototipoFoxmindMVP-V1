import { useState, useEffect } from 'react';
import type { Classroom } from '../model/Classroom';
import { classroomRepository } from '../data/inMemoryClassroomRepository';
import { joinClassroomByCode } from '../application/classroomMembership';
import { messagingStore } from '../../messaging/messagingStore';
import { toast } from '../../../components/ui/Toaster';

// Page lifetime: closing the dialog or selecting detail must not reset its code.
export function useStudentClassroomMembership() {
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

  return { classrooms, isJoinModalOpen, setIsJoinModalOpen, invitationCode, setInvitationCode, handleJoinClassroom };
}

export type StudentClassroomMembershipController = ReturnType<typeof useStudentClassroomMembership>;
