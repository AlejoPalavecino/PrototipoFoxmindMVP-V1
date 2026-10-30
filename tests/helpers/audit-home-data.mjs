export function homeFixture(rooms) {
  const empty = () => ({ status: 'ready', items: [], totalItems: 0, nextCursor: null });
  const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'];
  const modules = Object.fromEntries(names.map(name => [name, empty()]));
  modules.classrooms = { status:'ready', totalItems:rooms.length, nextCursor:null, items:rooms.map(room => ({ id:room.id, title:room.name, classroom:room, target:{kind:'classroom', classroomId:room.id} })) };
  return { version:1, subjectId:'fixture', generatedAt:'2026-10-28T12:00:00Z', timeZone:'UTC', participation:'mixed',
    memberships:{study:1,teach:1,archived:0}, setup:{drafts:0,invitations:0}, modules };
}
