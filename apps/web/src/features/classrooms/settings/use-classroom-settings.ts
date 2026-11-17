import { useEffect, useRef, useState } from 'react';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';

export function useClassroomSettings(id: string, room: Detail | null) {
  const [settings, setSettings] = useState({
    name: '',
    subject: '',
    division: '',
    academicYear: 2026,
    aiGradingEnabled: false, coverKey: 'general',
  });
  const settingsRoom = useRef<string | null>(null);
  const [settingsRevision, setSettingsRevision] = useState('');
  const [settingsConflict, setSettingsConflict] = useState(false);
  useEffect(() => {
    if (!room || settingsRoom.current === id) return;
    settingsRoom.current = id;
    setSettings({ name: room.name, subject: room.subject, division: room.division,
      academicYear: room.academicYear, coverKey: room.coverKey, aiGradingEnabled: room.aiGradingEnabled ?? false });
    setSettingsRevision(room.revision);
    setSettingsConflict(false);
  }, [id, room]);
  return { settings, setSettings, settingsRoom, settingsRevision, setSettingsRevision,
    settingsConflict, setSettingsConflict };
}
