import { useState } from 'react';
import type { FoxyPurpose } from '../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { ToolMode } from '../tools/foxy-tool-options.ts';

/** A first message waiting for its new conversation to exist before it is sent. */
export interface ConversationStart {
  title: string;
  text: string;
  purpose: FoxyPurpose;
  mode: ToolMode | null;
  message: string;
  context: string;
  previousId?: string;
}

export function useConversationStart() {
  const [starting, setStarting] = useState<ConversationStart | null>(null);
  const [startReady, setStartReady] = useState(false);
  return { starting, setStarting, startReady, setStartReady };
}
