import { useState } from 'react';
import type { StudentActivity } from '../model/Activity';
import type { SubmissionDelivery } from '../model/Submission';
import type { AulaTabId } from '../../../components/aulas/ClassroomTabsNav';
import { studentDetailInitialTab } from '../model/ClassroomDetail';
import { createStudentDetailFixtures } from '../data/classroomDetailFixtures';
import { submissionRepository } from '../data/inMemorySubmissionRepository';
import { createStudentActivities } from '../application/classroomActivities';
import { deliverSubmission } from '../application/deliverSubmission';

export function useStudentClassroomDetail() {
  const [tab, setTab] = useState<AulaTabId>(studentDetailInitialTab);
  const [alumnosViewMode, setAlumnosViewMode] = useState<'grid' | 'list'>('grid');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [activeTask, setActiveTask] = useState<StudentActivity | null>(null);
  const { studentProfile, studentCurriculum, students } = createStudentDetailFixtures();

  // Read current shared submissions once when initializing local activity state.
  const [activities, setActivities] = useState(() =>
    createStudentActivities(submissionRepository.read(), studentProfile.id)
  );

  const handleDeliverActivity = (submissionPayload: SubmissionDelivery) => {
    const updatedSubs = deliverSubmission(submissionRepository.read(), studentProfile.id, submissionPayload);
    submissionRepository.replace(updatedSubs);

    // Update local activity state
    setActivities(prev => prev.map(a => {
      if (a.id === activeTask?.id) {
        return {
          ...a,
          status: 'Entregada'
        };
      }
      return a;
    }));
  };

  return { tab, setTab, alumnosViewMode, setAlumnosViewMode, studentSearchTerm, setStudentSearchTerm,
    activeTask, setActiveTask, studentProfile, studentCurriculum, students, activities, handleDeliverActivity };
}

export type StudentClassroomDetailController = ReturnType<typeof useStudentClassroomDetail>;
