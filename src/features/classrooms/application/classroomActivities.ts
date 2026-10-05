import type { Activity, ActivityCreationInput, CreatedActivityData, StudentActivity } from '../model/Activity';
import type { Submission } from '../model/Submission';
import { createStudentActivityFixtures } from '../data/activityFixtures';

// Validation, topic selection, timers, toasts and reset stay in the wizard.
export function createActivity(input: ActivityCreationInput, now = Date.now): CreatedActivityData {
  return {
    id: now(),
    title: input.activityTitle,
    type: input.activityType,
    status: 'Activa',
    startDate: input.startDate,
    due: input.dueDate,
    submissions: `0/${input.studentCount || 28}`,
    description: input.activityDescription,
    topic: input.effectiveTopic,
    longInstructions: [
      { title: 'Pautas de trabajo', content: input.activityDescription },
      { title: 'Criterios de evaluación', content: 'Revisa la rúbrica asociada para guiar la elaboración de tus respuestas.' },
    ],
    attachment: input.uploadedActivityDoc ? {
      name: input.uploadedActivityDoc.name,
      size: input.uploadedActivityDoc.size,
      url: '#',
    } : input.attachedMaterial ? {
      name: input.attachedMaterial.name,
      size: input.attachedMaterial.size,
      url: '#',
      fromLibrary: input.attachedMaterial.fromLibrary,
    } : undefined,
    rubric: input.activityRubric,
    duaAdaptations: input.duaAdaptations,
    createdVia: input.activeCreationMode,
  };
}

// Keep the legacy assignment projection: startDate/topic/createdVia are not stored.
// The caller controls the local snapshot and synchronous repository replacement.
export function mapCreatedActivity(data: CreatedActivityData): Activity {
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    status: data.status,
    due: data.due,
    submissions: data.submissions,
    description: data.description,
    longInstructions: data.longInstructions,
    attachment: data.attachment,
    rubric: data.rubric,
    duaAdaptations: data.duaAdaptations,
  };
}

// Only the first activity reads the first matching submission, once at UI mount.
// This does not publish student state or include newly assigned teacher activities.
export function createStudentActivities(submissions: Submission[], studentId: number): StudentActivity[] {
  return createStudentActivityFixtures().map(act => {
    if (act.id === 1) {
      const sub = submissions.find(s => s.studentId === studentId);
      if (sub && sub.status !== 'missing') {
        return {
          ...act,
          status: sub.status === 'graded' ? 'Completada' : 'Entregada',
          grade: sub.grade !== null ? `${sub.grade}` : undefined,
          feedback: sub.feedback,
        };
      }
    }
    return act;
  });
}
