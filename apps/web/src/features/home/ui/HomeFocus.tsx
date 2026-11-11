import type { ClassroomItem, HomeResponse, HomeTarget } from '../../../../../../src/core/domain/index.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { HomeModule } from './HomeModule.tsx';
type Props={data:HomeResponse;selected:string;selectedItem?:ClassroomItem;onChoose?:()=>void;api?:ClassroomClient;onAction:(target:HomeTarget)=>void;onRetry:()=>void;onDraftRetry?:()=>void;onDrafts?:()=>void;onClassrooms:()=>void;busy?:boolean};
export function HomeFocus({data,selected,selectedItem,onChoose,onAction,onRetry,onDraftRetry,onDrafts,busy}:Props){
  const page=data.modules.classrooms;
  const eligible=page.status==='ready'?page.items.filter(item=>item.classroom.role==='teacher'&&!item.classroom.archived):[];
  const room=eligible.find(item=>item.classroom.id===selected)??(selectedItem?.classroom.role==='teacher'&&!selectedItem.classroom.archived?selectedItem:eligible[0]);
  return <><HomeModule name="classrooms" title="Aula en foco" headerAction={onChoose?<button className="fm-home-focus-choose" onClick={onChoose} disabled={busy}>Cambiar aula</button>:undefined} page={page.status==='ready'?{...page,items:room?[room]:[],nextCursor:null,totalItems:null}:page} timeZone={data.timeZone} onAction={onAction} onRetry={onRetry} busy={busy}/>
    <HomeModule name="drafts" page={data.modules.drafts??{status:'not-applicable'}} previewLimit={2} timeZone={data.timeZone} onAction={onAction} onRetry={onDraftRetry??onRetry} onExpand={onDrafts} busy={busy}/></>;
}
