import { useState } from 'react';
import type { FoxyTurn } from '../api/foxy-client';

/** Which side panels and dialogs of the Foxy workspace are open, and what each one shows. */
export function useWorkspacePanels() {
  const [contextOpen, setContextOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeReport, setScopeReport] = useState<FoxyTurn['classroomSources']>();
  const [sourceTurnId, setSourceTurnId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false),
    [renameTitle, setRenameTitle] = useState('');
  return {
    contextOpen,
    setContextOpen,
    libraryOpen,
    setLibraryOpen,
    scopeOpen,
    setScopeOpen,
    scopeReport,
    setScopeReport,
    sourceTurnId,
    setSourceTurnId,
    renameOpen,
    setRenameOpen,
    renameTitle,
    setRenameTitle,
  };
}
