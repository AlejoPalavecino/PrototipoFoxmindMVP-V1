import React from 'react';
import type { Classroom } from '../../model/Classroom';
import { useStudentClassroomDetail } from '../../hooks/useStudentClassroomDetail';
import { ClassroomHeroHeader } from '../../../../components/aulas/ClassroomHeroHeader';
import { ClassroomTabsNav } from '../../../../components/aulas/ClassroomTabsNav';
import { StudentActivityDetail } from '../../../../components/aulas/StudentActivityDetail';
import { StudentClassroomDetailBody } from './StudentClassroomDetailBody';

export function StudentClassroomDetail({ aula, onBack }: { aula: Classroom; onBack: () => void }) {
  const detail = useStudentClassroomDetail();
  const { tab, setTab, activeTask, setActiveTask, activities, studentProfile, handleDeliverActivity } = detail;

  // Preserve the activity early return: hero/tab/body unmount, controller does not.
  if (activeTask) {
    return (
      <StudentActivityDetail
        activity={activeTask}
        onBack={() => setActiveTask(null)}
        subjectName={aula.subject}
        courseName={aula.course}
        studentProfile={studentProfile}
        onDeliver={handleDeliverActivity}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FBFDFF]">
      {/* Unified Hero Header */}
      <ClassroomHeroHeader role="alumno" aula={aula} onBack={onBack} />

      {/* Tabs & Main View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Tabs Bar */}
        <ClassroomTabsNav
          activeTab={tab}
          onChangeTab={(newTab) => setTab(newTab)}
          role="alumno"
          activitiesCount={activities.length}
        />

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <StudentClassroomDetailBody aula={aula} detail={detail} />
          </div>
        </div>
      </div>
    </div>
  );
}
