import { useState } from 'react';
import type { StudyDetail, StudyCreation } from '../model/study-contracts.ts';
import { filterStudyCreations } from '../model/study-discovery.ts';

export function useStudyCreations(detail: StudyDetail) {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('ALL');
  const [creation, setCreation] = useState<StudyCreation>();
  const matchingCreations = filterStudyCreations(detail.creations, search, kind);
  const matchingPractices = filterStudyCreations(detail.practices, search, kind);
  const matchingPlans = detail.exams.filter(
    (exam) =>
      (kind === 'ALL' || kind === 'PLAN') &&
      (exam.title ?? '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return {
    search,
    setSearch,
    kind,
    setKind,
    creation,
    setCreation,
    matchingCreations,
    matchingPractices,
    matchingPlans,
  };
}
