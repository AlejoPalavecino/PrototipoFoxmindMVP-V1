import { useEffect, useState } from 'react';
import type { GenerationSource } from '../generation/generation-feedback.ts';
import { defaultGenerationForm } from '../generation/ActivityGenerationForm.tsx';
import type { ActivityData } from '../../../../../../src/core/contracts/activities.ts';
import type { ActivityAuthoringOperations } from '../model/authoring-operations.ts';

/**
 * How the teacher prepares the activity (by hand or with Foxy) and what Foxy receives: the idea,
 * the generation options and the library sources, read while the options are open.
 */
export function useGenerationRequest(api: ActivityAuthoringOperations, roomId: string, activity: ActivityData['activity'], canGenerate: boolean) {
  const [method, setMethod] = useState<'manual' | 'ai' | null>(
    activity.id || activity.title || !canGenerate ? 'manual' : null,
  );
  const [options, setOptions] = useState(defaultGenerationForm);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sources, setSources] = useState<GenerationSource[]>([]);
  const [sourcesError, setSourcesError] = useState('');
  useEffect(() => {
    if (!optionsOpen) return;
    const controller = new AbortController();
    void api.generation
      .sources(controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setSources(result.sources);
          setSourcesError('');
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) setSourcesError(error.message);
      });
    return () => controller.abort();
  }, [optionsOpen, api, roomId]);
  const [teacherBrief, setTeacherBrief] = useState(activity.teacherBrief ?? '');
  return { method, setMethod, options, setOptions, optionsOpen, setOptionsOpen, sources, sourcesError, teacherBrief, setTeacherBrief };
}
