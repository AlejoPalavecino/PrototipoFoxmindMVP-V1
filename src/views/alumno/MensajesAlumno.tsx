import React from 'react';
import { SharedMessagingHub } from '../../components/messaging/SharedMessagingHub';
import { useAppContext } from '../../context';

export function MensajesAlumno() {
  const { navigationParams } = useAppContext();
  const initialConvId = navigationParams?.conversationId;

  return (
    <div className="h-full flex flex-col">
      <SharedMessagingHub currentRole="alumno" initialConversationId={initialConvId} />
    </div>
  );
}
