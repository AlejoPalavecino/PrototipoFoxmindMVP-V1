import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Notifications } from '../apps/web/src/features/notifications/ui/Notifications.tsx';
const state = window.auditNotifications = { calls: [], pending: [], lateReject: false };
const make = (id, name, readAt) => ({ id, classroomId: 'a1111111-1111-4111-8111-111111111111', classroomName: name,
  eventType: 'WALL_NOTICE', postId: 'b1111111-1111-4111-8111-111111111111', replyId: null, createdAt: '2026-01-01T00:00:00Z', readAt });
const api = { call: async path => {
  state.calls.push(path);
  const url = new URL(path, 'http://fixture.local'), unread = url.searchParams.get('unread'), cursor = url.searchParams.get('cursor');
  if (cursor) return await new Promise((resolve, reject) => state.pending.push(() => state.lateReject ? reject(new Error('ERROR TARDÍO')) : resolve({ items: [make('late', 'LEÍDA TARDÍA', '2026-01-01T00:00:00Z')], nextCursor: 'stale-next', unreadCount: 1 })));
  return unread === 'true' ? { items: [make('unread', 'SOLO SIN LEER', null)], nextCursor: null, unreadCount: 1 }
    : { items: [make('read', 'LEÍDA INICIAL', '2026-01-01T00:00:00Z')], nextCursor: 'page-2', unreadCount: 1 };
} };
state.release = () => state.pending.splice(0).forEach(fn => fn());
function App() { const [refresh, setRefresh] = useState(0); state.refresh = () => setRefresh(n => n + 1); return <Notifications api={api} refresh={refresh} onOpen={() => {}} />; }
createRoot(document.getElementById('root')).render(<App />);
