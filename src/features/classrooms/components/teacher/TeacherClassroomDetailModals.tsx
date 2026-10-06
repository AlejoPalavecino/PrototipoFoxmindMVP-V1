import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { Classroom } from '../../model/Classroom';
import type { TeacherClassroomDetailController } from '../../hooks/useTeacherClassroomDetail';
import { CreateActivityModal } from '../../../../components/aulas/CreateActivityModal';
import { TeacherClassroomDetailMaterials } from './TeacherClassroomDetailMaterials';
import { TeacherClassroomDetailInvitation } from './TeacherClassroomDetailInvitation';
import { StudentProfilePanel } from './TeacherClassroomDetailProfile';

export function TeacherClassroomDetailModals({ aula, detail }: { aula: Classroom; detail: TeacherClassroomDetailController }) {
  const { isActivityModalOpen, setIsActivityModalOpen, curriculum, libraryFiles, students,
    handleCreateActivityFromModal, handleAddLibraryFile, selectedStudentProfile, setSelectedStudentProfile } = detail;

  return (
    <>
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
    </>
  );
}
