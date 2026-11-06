import type { HomeResponse, HomeTarget } from '../../src/core/domain/index.ts';
import type { ClassroomClient } from './api.ts';
import { HomeModule } from './HomeModule.tsx';
type Props={data:HomeResponse;selected:string;api?:ClassroomClient;onAction:(target:HomeTarget)=>void;onRetry:()=>void;onDraftRetry?:()=>void;onDrafts?:()=>void;onClassrooms:()=>void;busy?:boolean};
export function HomeFocus({data,selected,onAction,onRetry,onDraftRetry,onDrafts,onClassrooms,busy}:Props){
  const page=data.modules.classrooms;
  const eligible=page.status==='ready'?page.items.filter(item=>item.classroom.role==='teacher'&&!item.classroom.archived):[];
  const room=eligible.find(item=>item.classroom.id===selected)??eligible[0];
  return <><HomeModule name="classrooms" title="Aula en foco" page={page.status==='ready'?{...page,items:room?[room]:[],nextCursor:null,totalItems:null}:page} timeZone={data.timeZone} onAction={onAction} onRetry={onRetry} busy={busy}/>
    <HomeModule name="drafts" page={data.modules.drafts??{status:'not-applicable'}} previewLimit={2} timeZone={data.timeZone} onAction={onAction} onRetry={onDraftRetry??onRetry} onExpand={onDrafts} busy={busy}/></>;
}
