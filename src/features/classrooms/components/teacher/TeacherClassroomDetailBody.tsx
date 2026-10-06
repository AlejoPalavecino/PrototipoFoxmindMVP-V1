import React from 'react';
import type { Classroom } from '../../model/Classroom';
import type { TeacherClassroomDetailController } from '../../hooks/useTeacherClassroomDetail';
import { TeacherParticipantList } from './TeacherParticipantList';
import { TeacherActivityList } from './TeacherActivityList';
import { TeacherActivityDetail } from '../../../../components/aulas/TeacherActivityDetail';
import { ClassroomCurriculaTab } from '../../../../components/aulas/ClassroomCurriculaTab';
import { ClassroomBibliotecaTab } from '../../../../components/aulas/ClassroomBibliotecaTab';
import { ClassroomRendimientoTab } from '../../../../components/aulas/ClassroomRendimientoTab';
import { ClassroomMuroTab } from '../../../../components/aulas/ClassroomMuroTab';

export function TeacherClassroomDetailBody({ aula, detail }: { aula: Classroom; detail: TeacherClassroomDetailController }) {
  const {
    tab, students, studentSearchTerm, alumnosViewMode, setStudentSearchTerm, setAlumnosViewMode,
    setSelectedStudentProfile, handleGenerateReports, setIsInviteStudentModalOpen,
    selectedActivity, submissions, setSubmissions, setSelectedActivity, activities,
    setIsActivityModalOpen, curriculum, handleToggleTopic,
  } = detail;

  return (
    <>
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
    </>
  );
}
