import React, { useEffect } from 'react';
import { resolveStudentClassroom } from '../../features/classrooms';
import {
  useStudentClassroomMembership,
  StudentClassroomList, StudentClassroomJoinDialog, StudentClassroomDetail,
} from '../../features/classrooms/ui';
import type { Classroom } from '../../features/classrooms';
import { useAppContext } from '../../context';
import { motion, AnimatePresence } from 'motion/react';

export function AulasAlumno() {
  const { navigationParams, setView } = useAppContext();
  const membership = useStudentClassroomMembership();
  const { classrooms, setIsJoinModalOpen } = membership;
  const selectedAula = resolveStudentClassroom(classrooms, navigationParams);

  useEffect(() => {
    if (navigationParams?.aulaId && !selectedAula) setView('aulas', undefined, 'replace');
  }, [navigationParams?.aulaId, selectedAula, setView]);

  const handleSelect = (aula: Classroom) => setView('aulas', { aulaId: aula.id });
  const handleBack = () => setView('aulas', undefined, 'replace');

  return (
    <div className={`flex-1 flex flex-col ${!selectedAula ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-8' : ''}`}>
      <AnimatePresence mode="wait">
        {!selectedAula ? (
          <StudentClassroomList
            key="grid"
            classrooms={classrooms}
            onSelect={handleSelect}
            onJoin={() => setIsJoinModalOpen(true)}
          />
        ) : (
          <motion.div
            key={selectedAula.id}
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

      <StudentClassroomJoinDialog membership={membership} />
    </div>
  );
}
