import React from 'react';
import type { Classroom } from '../../model/Classroom';
import type { StudentClassroomDetailController } from '../../hooks/useStudentClassroomDetail';
import { StudentActivityList } from './StudentActivityList';
import { StudentParticipantList } from './StudentParticipantList';
import { ClassroomCurriculaTab } from '../../../../components/aulas/ClassroomCurriculaTab';
import { ClassroomBibliotecaTab } from '../../../../components/aulas/ClassroomBibliotecaTab';
import { ClassroomRendimientoTab } from '../../../../components/aulas/ClassroomRendimientoTab';
import { ClassroomMuroTab } from '../../../../components/aulas/ClassroomMuroTab';

export function StudentClassroomDetailBody({ aula, detail }: { aula: Classroom; detail: StudentClassroomDetailController }) {
  const { tab, activities, setActiveTask, studentCurriculum, students, studentSearchTerm,
    alumnosViewMode, setStudentSearchTerm, setAlumnosViewMode } = detail;
  return (
    <>
            {/* TAB: ACTIVIDADES */}
            {tab === 'actividades' && (
              <StudentActivityList activities={activities} onSelect={setActiveTask} />
            )}

            {/* TAB: CURRICULA */}
            {tab === 'curricula' && (
              <ClassroomCurriculaTab
                role="alumno"
                subjectName={aula.subject}
                curriculum={studentCurriculum}
              />
            )}

            {/* TAB: BIBLIOTECA */}
            {tab === 'biblioteca' && (
              <ClassroomBibliotecaTab
                role="alumno"
                subjectName={aula.subject}
              />
            )}

            {/* TAB: RENDIMIENTO */}
            {tab === 'rendimiento' && (
              <ClassroomRendimientoTab
                role="alumno"
                subjectName={aula.subject}
              />
            )}

            {/* TAB: MURO */}
            {tab === 'muro' && (
              <ClassroomMuroTab
                role="alumno"
                aulaId={aula.id}
                subjectName={aula.subject}
                courseName={aula.course}
              />
            )}

            {/* TAB: ALUMNOS / COMPAÑEROS */}
            {tab === 'alumnos' && (
              <StudentParticipantList
                students={students.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))}
                studentSearchTerm={studentSearchTerm}
                alumnosViewMode={alumnosViewMode}
                onSearchChange={setStudentSearchTerm}
                onViewModeChange={setAlumnosViewMode}
              />
            )}
    </>
  );
}
