import { useEffect,useState } from 'react';
import type {TeacherSupportEntry} from '../../../../../src/core/contracts/teacher-support.ts';
import type {TeacherSupportReader} from './model.ts';

export function useRosterSupport(client:TeacherSupportReader|undefined, classroomId:string, memberIds:string, revision:number) {
  const [snapshot,setSnapshot] = useState<{room:string; members:string; results:Map<string,TeacherSupportEntry>}>();
  useEffect(() => {
    if (!client || !memberIds) return;
    const request = new AbortController();
    const eligible = new Set(memberIds.split(','));
    async function read() {
      const results = new Map<string,TeacherSupportEntry>();
      for (let index=1; !request.signal.aborted && results.size<eligible.size; index++) {
        const page = await client!.list(classroomId,index,request.signal,true);
        for (const item of page.items) {
          if (item.classroomId===classroomId && eligible.has(item.studentId)) results.set(item.studentId,item);
        }
        if (index * page.pageSize >= page.total || !page.items.length) break;
      }
      if (!request.signal.aborted) setSnapshot({room:classroomId,members:memberIds,results});
    }
    void read().catch(() => { if (!request.signal.aborted) setSnapshot(undefined); });
    return () => request.abort();
  },[client,classroomId,memberIds,revision]);
  return client && snapshot?.room===classroomId && snapshot.members===memberIds ? snapshot.results : undefined;
}
