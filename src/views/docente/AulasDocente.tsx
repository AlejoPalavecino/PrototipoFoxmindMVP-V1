import React, { useState, useEffect } from 'react';
import {
  classroomRepository, classroomDetailSession, resolveTeacherClassroom,
} from '../../features/classrooms';
import {
  TeacherClassroomList, TeacherClassroomCreateFlow, useTeacherClassroomCreation, TeacherClassroomDetail,
} from '../../features/classrooms/ui';
import type { Classroom } from '../../features/classrooms';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context';

export function AulasDocente() {
  const { navigationParams, setView } = useAppContext();
  const [classrooms, setClassrooms] = useState(classroomRepository.readCatalogue());
  const selectedAula = resolveTeacherClassroom(classrooms, navigationParams);
  const creation = useTeacherClassroomCreation(({ classroom, curriculum }) => {
    // Same session replacement and captured page-local list; no catalogue write.
    classroomDetailSession.replaceCurriculum(curriculum);
    setClassrooms([classroom, ...classrooms]);
  });

  useEffect(() => {
    if (navigationParams?.openAulaId && !selectedAula) setView('aulas', undefined, 'replace');
  }, [navigationParams?.openAulaId, selectedAula, setView]);

  const handleSelect = (aula: Classroom) => setView('aulas', { openAulaId: aula.id });
  const handleBack = () => setView('aulas', undefined, 'replace');

  return (
    <div className={`flex-1 flex flex-col ${!selectedAula ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-8' : ''}`}>
      <AnimatePresence mode="wait">
        {!selectedAula ? (
          <TeacherClassroomList
            key="grid"
            classrooms={classrooms}
            onSelect={handleSelect}
            onCreate={creation.handleOpenModal}
          >
            <TeacherClassroomCreateFlow creation={creation} />
          </TeacherClassroomList>
        ) : (
          <motion.div
            key={selectedAula.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 flex flex-col bg-fox-surface w-full h-full rounded-3xl overflow-hidden shadow-sm border border-fox-border mb-6"
          >
            <TeacherClassroomDetail aula={selectedAula} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
