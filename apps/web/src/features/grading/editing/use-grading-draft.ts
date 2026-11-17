import { useCallback, useState } from 'react';
import type { GradingData } from '../../../../../../src/core/contracts/grading.ts';
import { parseFeedback } from '../ui/overall-feedback.ts';

/** One owner for the loaded revision, draft and the decision that can discard it. */
export function useGradingDraft() {
  const [data, setData] = useState<GradingData | null>(null);
  const [overall, setOverall] = useState(''), [feedback, setFeedback] = useState(() => parseFeedback(null));
  const [marks, setMarks] = useState<Record<number, string>>({}), [override, setOverride] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({}), [comments, setComments] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false), [confirming, setConfirming] = useState(false);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const clear = useCallback(() => setData(null), []);
  const restore = useCallback((next: GradingData) => {
    setData(next);
    setOverall((next.grade.calculatedGrade !== undefined ? next.grade.calculatedGrade : next.grade.finalGrade) ?? '');
    setFeedback(parseFeedback(next.grade.overallFeedback));
    setMarks(Object.fromEntries((next.grade.rubricMarks ?? []).map(mark => [mark.criterionIndex, mark.score ?? ''])));
    setOverride(next.grade.finalGradeOverride ?? null);
    setPoints(Object.fromEntries(next.activity.questions.map(question => [question.id, question.manualPoints ?? ''])));
    setComments(Object.fromEntries(next.activity.questions.map(question => [question.id, question.feedback ?? ''])));
    setDirty(false); setConfirming(false);
  }, []);
  const change = () => { setDirty(true); setConfirming(false); };
  function leaveEditor(action: () => void) {
    if (dirty) setLeave(() => action);
    else action();
  }
  return { data, clear, overall, setOverall, feedback, setFeedback, marks, setMarks, override, setOverride,
    points, setPoints, comments, setComments, dirty, confirming, setConfirming, leave, setLeave, restore, change, leaveEditor };
}
