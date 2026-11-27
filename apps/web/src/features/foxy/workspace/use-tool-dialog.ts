import { useState } from 'react';
import type { FoxyCreation } from '../api/foxy-client';
import type { ToolMode } from '../tools/foxy-tool-options.ts';

/** The tool dialog: which tool, how it opened and what it starts from. */
export function useToolDialog() {
  const [repeatSelection, setRepeatSelection] = useState<FoxyCreation['selection']>();
  const [initialToolBrief, setInitialToolBrief] = useState('');
  const [toolDialog, setToolDialog] = useState<ToolMode | null>(null);
  const [toolInline, setToolInline] = useState(false),
    [toolQuiz, setToolQuiz] = useState(false);
  return {
    repeatSelection,
    setRepeatSelection,
    initialToolBrief,
    setInitialToolBrief,
    toolDialog,
    setToolDialog,
    toolInline,
    setToolInline,
    toolQuiz,
    setToolQuiz,
  };
}
