import React from 'react';
import { SharedMessagingHub } from '../../components/messaging/SharedMessagingHub';
import { useAppContext } from '../../context';

export function MensajesDocente() {
  const { navigationParams } = useAppContext();
  const initialConvId = navigationParams?.conversationId || (navigationParams?.contactId === '1' ? 'dm-directora' : navigationParams?.contactId === '2' ? 'dm-laura-tomas' : undefined);

  return (
    <div className="h-full flex flex-col">
      <SharedMessagingHub currentRole="docente" initialConversationId={initialConvId} />
    </div>
  );
}
