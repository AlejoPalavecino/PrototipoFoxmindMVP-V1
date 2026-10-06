import React, { useState, useEffect } from 'react';
import { mockClassroomsDocente } from '../../mockData';
import { classroomDetailSession, resolveTeacherClassroom } from '../../features/classrooms';
import { TeacherActivityList, TeacherClassroomList, TeacherClassroomCreateFlow, useTeacherClassroomCreation, TeacherParticipantList, useTeacherClassroomDetail } from '../../features/classrooms/ui';
import { Classroom } from '../../types';
import { 
  BookOpen, CheckCircle2, AlertCircle, BarChart2, Plus, X,
  Users, BrainCircuit, Search, MoreVertical,
  Clock, Calendar, CheckSquare, Square, Sparkles, Bell, Eye, Send, MessageSquare, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ArrowLeft, PenTool, Trash2,
  Library, LayoutGrid, List, Folder, Network, Target, Mail, UserCheck, SendHorizontal, GraduationCap, Copy, Check, KeyRound, Link, Info
} from 'lucide-react';
import { toast } from '../../components/ui/Toaster';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context';
import { ClassroomHeroHeader } from '../../components/aulas/ClassroomHeroHeader';
import { ClassroomTabsNav, AulaTabId } from '../../components/aulas/ClassroomTabsNav';
import { ClassroomMuroTab } from '../../components/aulas/ClassroomMuroTab';
import { ClassroomCurriculaTab } from '../../components/aulas/ClassroomCurriculaTab';
import { ClassroomBibliotecaTab } from '../../components/aulas/ClassroomBibliotecaTab';
import { ClassroomRendimientoTab } from '../../components/aulas/ClassroomRendimientoTab';
import { CreateActivityModal } from '../../components/aulas/CreateActivityModal';
import { TeacherActivityDetail } from '../../components/aulas/TeacherActivityDetail';
import { StudentProfilePanel } from '../../features/classrooms/components/teacher/TeacherClassroomDetailProfile';
import { TeacherClassroomDetailMaterials } from '../../features/classrooms/components/teacher/TeacherClassroomDetailMaterials';
import { TeacherClassroomDetailInvitation } from '../../features/classrooms/components/teacher/TeacherClassroomDetailInvitation';


export function AulasDocente() {
  const { navigationParams } = useAppContext();
  const [classrooms, setClassrooms] = useState(mockClassroomsDocente);
  const [selectedAula, setSelectedAula] = useState<Classroom | null>(null);
  const creation = useTeacherClassroomCreation(({ classroom, curriculum }) => {
    // Keep the volatile session replacement and page-local (not catalogue) list.
    classroomDetailSession.replaceCurriculum(curriculum);
    setClassrooms([classroom, ...classrooms]);
  });

  useEffect(() => {
    const aula = resolveTeacherClassroom(classrooms, navigationParams);
    if (aula) setSelectedAula(aula);
  }, [navigationParams, classrooms]);

  return (
    <div className={`flex-1 flex flex-col ${!selectedAula ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-8' : ''}`}>
      <AnimatePresence mode="wait">
        {!selectedAula ? (
          <TeacherClassroomList
            key="grid"
            classrooms={classrooms}
            onSelect={setSelectedAula}
            onCreate={creation.handleOpenModal}
          >

            <TeacherClassroomCreateFlow creation={creation} />
          </TeacherClassroomList>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 flex flex-col bg-fox-surface w-full h-full rounded-3xl overflow-hidden shadow-sm border border-fox-border mb-6"
          >
            <AulaDetail aula={selectedAula} onBack={() => setSelectedAula(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- AULA DETAIL COMPONENT ---

function AulaDetail({ aula, onBack }: { aula: Classroom, onBack: () => void }) {
  const detail = useTeacherClassroomDetail(aula);
  const {
    tab, setTab, isActivityModalOpen, setIsActivityModalOpen, setIsPlanModalOpen,
    isInviteStudentModalOpen, setIsInviteStudentModalOpen, inviteModalTab, setInviteModalTab,
    inviteEmailInput, setInviteEmailInput, invitedEmailsList, setInvitedEmailsList,
    inviteCustomNote, setInviteCustomNote, copiedCode, setCopiedCode, copiedLink, setCopiedLink,
    alumnosViewMode, setAlumnosViewMode, fileInputRef, selectedActivity, setSelectedActivity,
    selectedStudentProfile, setSelectedStudentProfile, students, setStudents, activities,
    submissions, setSubmissions, studentSearchTerm, setStudentSearchTerm, libraryFiles,
    librarySearchTerm, setLibrarySearchTerm, curriculum, foxySuggestion, handleToggleTopic,
    handleGenerateReports, handleAddInviteEmail, handleRemoveInviteEmail, handleSendEmailInvitations,
    handleDeleteFile, filteredLibraryFiles, handleCreateActivityFromModal, handleAddLibraryFile,
  } = detail;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FBFDFF]">
      {/* Unified Classroom Hero Header */}
      <ClassroomHeroHeader
        role="docente"
        subject={aula.subject}
        course={aula.course}
        color={aula.color}
        studentsCount={aula.studentsCount}
        onBack={onBack}
        activeTab={tab as AulaTabId}
        onNewActivity={() => setIsActivityModalOpen(true)}
        onViewPlan={() => setIsPlanModalOpen(true)}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Tabs Nav */}
        <ClassroomTabsNav
          role="docente"
          activeTab={tab as AulaTabId}
          onTabChange={(newTab) => {
            setTab(newTab as any);
            setSelectedActivity(null);
          }}
          studentsCount={aula.studentsCount}
          activeTasksCount={activities.length}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
          
          {/* TAB: ALUMNOS */}
          {tab === 'alumnos' && (
            <TeacherParticipantList
              students={students.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))}
              studentSearchTerm={studentSearchTerm}
              alumnosViewMode={alumnosViewMode}
              onSearchChange={setStudentSearchTerm}
              onViewModeChange={setAlumnosViewMode}
              onSelect={setSelectedStudentProfile}
              onGenerateReports={handleGenerateReports}
              onInvite={() => setIsInviteStudentModalOpen(true)}
            />
          )}

          {/* TAB: ACTIVIDADES */}
          {tab === 'actividades' && (
            <div className="animate-in fade-in h-full">
              {selectedActivity ? (
                <TeacherActivityDetail 
                  activity={selectedActivity} 
                  submissions={submissions}
                  setSubmissions={setSubmissions}
                  onBack={() => setSelectedActivity(null)} 
                  subjectName={aula.subject}
                  courseName={aula.course}
                />
              ) : (
                <TeacherActivityList
                  activities={activities}
                  onSelect={setSelectedActivity}
                  onCreate={() => setIsActivityModalOpen(true)}
                />
              )}
            </div>
          )}

          {/* TAB: CURRICULA */}
          {tab === 'curricula' && (
            <ClassroomCurriculaTab
              role="docente"
              subjectName={aula.subject}
              curriculum={curriculum}
              onToggleTopic={handleToggleTopic}
            />
          )}

          {/* TAB: BIBLIOTECA */}
          {tab === 'biblioteca' && (
            <ClassroomBibliotecaTab
              role="docente"
              subjectName={aula.subject}
            />
          )}

          {/* TAB: RENDIMIENTO */}
          {tab === 'rendimiento' && (
            <ClassroomRendimientoTab
              role="docente"
              subjectName={aula.subject}
              students={students}
              onSelectStudentProfile={(st) => setSelectedStudentProfile(st)}
            />
          )}

          {/* TAB: MURO */}
          {tab === 'muro' && (
            <ClassroomMuroTab
              role="docente"
              aulaId={aula.id}
              subjectName={aula.subject}
              courseName={aula.course}
            />
          )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Actividad (Flujo Crear con IA / Subir Archivo + DUA) */}
      <CreateActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        subjectName={aula.subject}
        courseName={aula.course}
        curriculum={curriculum}
        libraryFiles={libraryFiles}
        students={students}
        onCreateActivity={handleCreateActivityFromModal}
        onAddLibraryFile={handleAddLibraryFile}
      />

      <TeacherClassroomDetailMaterials detail={detail} />

      {/* Student Profile Panel */}
      <AnimatePresence>
        {selectedStudentProfile && (
          <StudentProfilePanel 
            student={selectedStudentProfile} 
            onClose={() => setSelectedStudentProfile(null)} 
          />
        )}
      </AnimatePresence>

      <TeacherClassroomDetailInvitation aula={aula} detail={detail} />
    </div>
  );
}
