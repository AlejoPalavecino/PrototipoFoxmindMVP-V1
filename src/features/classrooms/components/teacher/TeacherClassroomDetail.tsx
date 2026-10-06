import React from 'react';
import type { Classroom } from '../../model/Classroom';
import { useTeacherClassroomDetail } from '../../hooks/useTeacherClassroomDetail';
import { ClassroomHeroHeader } from '../../../../components/aulas/ClassroomHeroHeader';
import { ClassroomTabsNav, type AulaTabId } from '../../../../components/aulas/ClassroomTabsNav';
import { TeacherClassroomDetailBody } from './TeacherClassroomDetailBody';
import { TeacherClassroomDetailModals } from './TeacherClassroomDetailModals';

export function TeacherClassroomDetail({ aula, onBack }: { aula: Classroom; onBack: () => void }) {
  const detail = useTeacherClassroomDetail(aula);
  const { tab, setTab, activities, setSelectedActivity, setIsActivityModalOpen, setIsPlanModalOpen } = detail;

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
            setTab(newTab as AulaTabId);
            setSelectedActivity(null);
          }}
          studentsCount={aula.studentsCount}
          activeTasksCount={activities.length}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <TeacherClassroomDetailBody aula={aula} detail={detail} />
          </div>
        </div>
      </div>

      <TeacherClassroomDetailModals aula={aula} detail={detail} />
    </div>
  );
}
