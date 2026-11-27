import { useState } from 'react';
import type { ActivityData } from '../../../../../../src/core/contracts/activities.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import type { GenerationFormValue } from '../../../features/activity-authoring/index.ts';

/** What the activity editor opens with: the draft, its curricular context, the step and the Foxy request. */
export function useActivityEditorState(creationContext?: ClassroomCreationContext | null) {
  const [assignment, setAssignment] = useState<ClassroomCreationContext>(
    creationContext ?? { unitId: '', topicIds: [] },
  );
  const [editorContext, setEditorContext] = useState<ClassroomCreationContext | null>(null);
  const [editorReview, setEditorReview] = useState(false);
  const [pendingCreationContext, setPendingCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStart, setGenerationStart] = useState<GenerationFormValue | null>(null);
  const [editorContent, setEditorContent] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [editing, setEditing] = useState<ActivityData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  return {
    assignment,
    setAssignment,
    editorContext,
    setEditorContext,
    editorReview,
    setEditorReview,
    pendingCreationContext,
    setPendingCreationContext,
    generating,
    setGenerating,
    generationStart,
    setGenerationStart,
    editorContent,
    setEditorContent,
    choosing,
    setChoosing,
    editing,
    setEditing,
    materials,
    setMaterials,
  };
}
