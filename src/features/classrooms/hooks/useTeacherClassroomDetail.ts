import { useState, useEffect, useRef } from 'react';
import type { Classroom } from '../model/Classroom';
import type { Activity, CreatedActivityData } from '../model/Activity';
import { teacherDetailInitialTab } from '../model/ClassroomDetail';
import { classroomDetailSession, initializeTeacherCurriculum } from '../data/classroomSession';
import { activityRepository } from '../data/inMemoryActivityRepository';
import { submissionRepository } from '../data/inMemorySubmissionRepository';
import { mapCreatedActivity } from '../application/classroomActivities';
import { resolveTeacherActivity } from '../application/classroomNavigation';
import { messagingStore } from '../../messaging/messagingStore';
import { toast } from '../../../components/ui/Toaster';
import { useAppContext } from '../../../context';
import type { LibraryItem } from '../../../components/aulas/CreateActivityModal';

// Detail mount owns snapshots, modal drafts and callbacks. No new subscriptions.
export function useTeacherClassroomDetail(aula: Classroom) {
  const { navigationParams, setView } = useAppContext();
  const [tab, setTab] = useState(teacherDetailInitialTab);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const [isInviteStudentModalOpen, setIsInviteStudentModalOpen] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<'email' | 'code'>('email');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [invitedEmailsList, setInvitedEmailsList] = useState<string[]>([]);
  const [inviteCustomNote, setInviteCustomNote] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [alumnosViewMode, setAlumnosViewMode] = useState<'grid'|'list'>('grid');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null);

  const [students, setStudents] = useState(classroomDetailSession.readStudents());
  const [activities, setActivities] = useState(() => activityRepository.read());
  const [submissions, setSubmissions] = useState(() => submissionRepository.read());
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [libraryFiles, setLibraryFiles] = useState([
    { id: 1, title: "Manual de Biología Celular", type: "PDF", size: "2.4 MB", date: "12 may 2026", color: "text-red-500", bg: "bg-red-100" },
    { id: 2, title: "Diapositivas - Tema 1", type: "PPTX", size: "5.1 MB", date: "10 may 2026", color: "text-orange-500", bg: "bg-orange-100" },
    { id: 3, title: "Guía de Trabajos Prácticos", type: "PDF", size: "1.1 MB", date: "05 may 2026", color: "text-red-500", bg: "bg-red-100" },
  ]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] = useState('PDF');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  // Keep the original eager mount initializer, including completed-topic copies.
  const [curriculum, setCurriculum] = useState(initializeTeacherCurriculum(classroomDetailSession.readCurriculum()));
  const [foxySuggestion, setFoxySuggestion] = useState<{topic: string, nextTopic: string | null} | null>(null);

  const handleToggleTopic = (unitId: number, topic: string) => {
    setCurriculum(prev => prev.map(u => {
      if (u.id === unitId) {
        const isCompleted = u.completedTopics.includes(topic);
        const newCompleted = isCompleted
          ? u.completedTopics.filter(t => t !== topic)
          : [...u.completedTopics, topic];

        if (!isCompleted) {
          const topicIndex = u.topics.indexOf(topic);
          const nextTopic = topicIndex < u.topics.length - 1 ? u.topics[topicIndex + 1] : null;
          setFoxySuggestion({ topic, nextTopic });
        } else {
          setFoxySuggestion(null);
        }

        return { ...u, completedTopics: newCompleted };
      }
      return u;
    }));
  };

  const handleGenerateReports = () => {
    setView('copiloto', { initialPrompt: `Redactar reportes mensuales de desempeño académico y actitudinal para los alumnos de ${aula.subject} ${aula.course}. Enfócate en la asistencia, notas, entregas y sugiere recomendaciones para los padres enfocándote en los alumnos en riesgo.` });
  };

  const handleAddInviteEmail = (rawText?: string) => {
    const textToAdd = rawText !== undefined ? rawText : inviteEmailInput;
    if (!textToAdd.trim()) return;

    // Support multiple comma/space/semicolon-separated emails
    const candidateEmails = textToAdd
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    candidateEmails.forEach(email => {
      if (emailRegex.test(email)) {
        if (!invitedEmailsList.includes(email) && !validEmails.includes(email)) {
          validEmails.push(email);
        }
      } else {
        invalidEmails.push(email);
      }
    });

    if (validEmails.length > 0) {
      setInvitedEmailsList(prev => [...prev, ...validEmails]);
      setInviteEmailInput('');
      toast.show(validEmails.length === 1 ? `✅ Correo ${validEmails[0]} agregado` : `✅ ${validEmails.length} correos agregados a la lista`, 'success');
    }

    if (invalidEmails.length > 0) {
      toast.show(`⚠️ Formato inválido: ${invalidEmails.join(', ')}`, 'warning');
    }
  };

  const handleRemoveInviteEmail = (emailToRemove: string) => {
    setInvitedEmailsList(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleSendEmailInvitations = () => {
    let allEmails = [...invitedEmailsList];
    if (inviteEmailInput.trim()) {
      const email = inviteEmailInput.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email) && !allEmails.includes(email)) {
        allEmails.push(email);
      }
    }

    if (allEmails.length === 0) {
      toast.show('Ingresa al menos un correo electrónico válido de alumno', 'warning');
      return;
    }

    const classCode = `${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;

    // Send invitations via messagingStore for each student email
    allEmails.forEach(email => {
      messagingStore.sendClassroomInvitation({
        recipientEmail: email,
        senderTeacherId: 'docente-laura',
        senderTeacherName: 'Prof. Laura Martínez',
        classroom: aula,
        code: classCode,
        customNote: inviteCustomNote.trim() || undefined
      });
    });

    toast.show(`📨 Se enviaron ${allEmails.length} invitación(es) a las cuentas de los alumnos.`, 'success');
    setIsInviteStudentModalOpen(false);
    setInviteEmailInput('');
    setInvitedEmailsList([]);
    setInviteCustomNote('');
  };

  const handleUploadFile = () => {
    if (!newFileTitle.trim()) {
      toast.show('Ingresa un título para el material', 'error');
      return;
    }
    const newFile = {
      id: Date.now(),
      title: newFileTitle,
      type: newFileType,
      size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
      color: newFileType === 'PDF' ? "text-red-500" : newFileType === 'PPTX' ? "text-orange-500" : newFileType === 'DOCX' ? "text-blue-500" : "text-green-500",
      bg: newFileType === 'PDF' ? "bg-red-100" : newFileType === 'PPTX' ? "bg-orange-100" : newFileType === 'DOCX' ? "bg-blue-100" : "bg-green-100"
    };
    setLibraryFiles([newFile, ...libraryFiles]);
    setIsUploadModalOpen(false);
    setNewFileTitle('');
    setNewFileType('PDF');
    toast.show('Material subido correctamente a la biblioteca', 'success');
  };

  const handleDeleteFile = (id: number) => {
    setLibraryFiles(libraryFiles.filter(f => f.id !== id));
    toast.show('Material eliminado de la biblioteca', 'info');
  };

  const filteredLibraryFiles = libraryFiles.filter(file =>
    file.title.toLowerCase().includes(librarySearchTerm.toLowerCase()) ||
    file.type.toLowerCase().includes(librarySearchTerm.toLowerCase())
  );

  useEffect(() => {
    if (navigationParams?.openTask && navigationParams?.taskTitle) {
      setTab('actividades');
      const activity = resolveTeacherActivity(activities, navigationParams.taskTitle);
      setSelectedActivity(activity);

      // Consume the transient task shortcut without erasing the resolved classroom.
      setView('aulas', { openAulaId: aula.id }, 'replace');
    }
  }, [navigationParams, setView, aula.id]);

  const handleCreateActivityFromModal = (newActivityData: CreatedActivityData) => {
    const newActivity = mapCreatedActivity(newActivityData);
    setActivities(prev => {
      const next = [newActivity, ...prev];
      activityRepository.replace(next);
      return next;
    });
  };

  const handleAddLibraryFile = (newFile: LibraryItem) => {
    setLibraryFiles(prev => [newFile, ...prev]);
  };

  return {
    tab, setTab, isActivityModalOpen, setIsActivityModalOpen, isPlanModalOpen, setIsPlanModalOpen,
    isInviteStudentModalOpen, setIsInviteStudentModalOpen, inviteModalTab, setInviteModalTab,
    inviteEmailInput, setInviteEmailInput, invitedEmailsList, setInvitedEmailsList,
    inviteCustomNote, setInviteCustomNote, copiedCode, setCopiedCode, copiedLink, setCopiedLink,
    alumnosViewMode, setAlumnosViewMode, fileInputRef, selectedActivity, setSelectedActivity,
    selectedStudentProfile, setSelectedStudentProfile, students, setStudents, activities,
    submissions, setSubmissions, studentSearchTerm, setStudentSearchTerm, libraryFiles,
    isUploadModalOpen, setIsUploadModalOpen, newFileTitle, setNewFileTitle, newFileType, setNewFileType,
    librarySearchTerm, setLibrarySearchTerm, curriculum, foxySuggestion, handleToggleTopic,
    handleGenerateReports, handleAddInviteEmail, handleRemoveInviteEmail, handleSendEmailInvitations,
    handleUploadFile, handleDeleteFile, filteredLibraryFiles, handleCreateActivityFromModal, handleAddLibraryFile,
  };
}

export type TeacherClassroomDetailController = ReturnType<typeof useTeacherClassroomDetail>;
