import { useState } from 'react';
import type { StudyCommand } from '../model/study-commands.ts';

export function useStudyPractice(command: StudyCommand, clearDirty: () => void) {
  const [practice, setPractice] = useState('');
  const [preview, setPreview] = useState('');
  async function newAttempt() {
    const response = await command('NEW_ATTEMPT', { practiceId: practice });
    const next = response && response.result?.practice;
    if (next) {
      setPractice(next.id);
      clearDirty();
    }
  }
  return { practice, setPractice, preview, setPreview, newAttempt };
}
