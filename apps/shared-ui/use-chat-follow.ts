import { useEffect, useRef, useState } from 'react';
import { shouldFollowChat } from './chat-follow';

export function useChatFollow(conversationId: string | undefined, contentStamp: string) {
  const ref = useRef<HTMLDivElement>(null), following = useRef(true);
  const [unread, setUnread] = useState(false);
  const jump = () => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; following.current = true; setUnread(false); };
  useEffect(() => { following.current = true; setUnread(false); }, [conversationId]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (following.current) node.scrollTop = node.scrollHeight;
    else setUnread(true);
  }, [conversationId, contentStamp]);
  useEffect(() => {
    const node=ref.current;
    if (!node || typeof ResizeObserver==='undefined') return;
    const observer=new ResizeObserver(()=>{
      if (following.current) node.scrollTop=node.scrollHeight;
    });
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return ()=>observer.disconnect();
  }, [conversationId,contentStamp]);
  return { ref, unread, jump, onScroll: () => {
    if (!ref.current) return;
    following.current = shouldFollowChat(ref.current);
    if (following.current) setUnread(false);
  } };
}
