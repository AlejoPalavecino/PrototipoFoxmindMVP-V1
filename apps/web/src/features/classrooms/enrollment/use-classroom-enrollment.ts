import { useState } from 'react';
import type { ClassroomCodePreview } from '../../../../../../src/core/contracts/classrooms.ts';
import type { EnrollmentOperations } from './enrollment-api.ts';

export function useClassroomEnrollment(
  operations: EnrollmentOperations,
  setBusy: (busy: boolean) => void,
  onJoined: (preview: ClassroomCodePreview) => Promise<void>,
) {
  const [join, setJoin] = useState(false);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<ClassroomCodePreview | null>(null);
  const [joinError, setJoinError] = useState('');
  async function enterCode() {
    setBusy(true);
    setJoinError('');
    try {
      if (preview) {
        await operations.confirmCode(preview.confirmation);
        setJoin(false);
        setPreview(null);
        setCode('');
        await onJoined(preview);
      } else setPreview(await operations.previewCode(code));
    } catch (error) {
      setJoinError((error as Error).message);
      setPreview(null);
    } finally { setBusy(false); }
  }
  return { join, setJoin, code, setCode, preview, setPreview, joinError, setJoinError, enterCode };
}
