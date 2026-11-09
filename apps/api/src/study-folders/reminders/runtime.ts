import type {StudyFileDatabase,StudyFileQuery} from '../uploads/types.ts';
import {studyFileError} from '../uploads/upload-policy.ts';

export function createStudyReminderRuntime(options:{database:StudyFileDatabase;authenticate(tx:StudyFileQuery,request:unknown,write:boolean):Promise<string>}) {
  let pending:Promise<void>|undefined,closing=false;
  async function tick(){
    if(closing)return;if(pending)return pending;
    pending=options.database.$transaction(async raw=>{
      // A direct Agenda edit/removal invalidates the old schedule and its notice.
      await raw.$queryRawUnsafe(`UPDATE study_review_sessions s SET cancelled_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE s.cancelled_at IS NULL AND NOT EXISTS(SELECT 1 FROM agenda_events e JOIN study_folders f ON f.id=s.folder_id
          WHERE e.id=s.agenda_event_id AND e.owner_id=s.owner_id AND e.revision=s.event_revision AND f.status='ACTIVE') RETURNING s.id`);
      await raw.$queryRawUnsafe(`UPDATE study_review_sessions s SET notified_at=clock_timestamp(),updated_at=clock_timestamp()
        FROM agenda_events e,study_folders f,users u WHERE s.agenda_event_id=e.id AND e.revision=s.event_revision AND f.id=s.folder_id
        AND f.owner_id=s.owner_id AND f.status='ACTIVE' AND u.id=s.owner_id AND u.account_role='student' AND u.email_verified_at IS NOT NULL
        AND s.cancelled_at IS NULL AND s.notified_at IS NULL AND s.notify_at<=clock_timestamp() AND s.ends_at>clock_timestamp() RETURNING s.id`);
    }).then(()=>{}).finally(()=>{pending=undefined;});return pending;
  }
  const timer=setInterval(()=>{void tick().catch(()=>{/* Durable rows retry on the next tick; no personal data in logs. */});},30_000);timer.unref();
  async function authorized<T>(request:unknown,write:boolean,operation:(tx:StudyFileQuery,owner:string)=>Promise<T>){
    return options.database.$transaction(async raw=>{
      const tx:StudyFileQuery={query:(sql,...values)=>raw.$queryRawUnsafe(sql,...values)},owner=await options.authenticate(tx,request,write);
      const [user]=await tx.query<{account_role:string;email_verified_at:Date|null}>('SELECT account_role,email_verified_at FROM users WHERE id=$1::uuid FOR SHARE',owner);
      if(user?.account_role!=='student'||!user.email_verified_at)return studyFileError('FORBIDDEN');
      const result=await operation(tx,owner);if(await options.authenticate(tx,request,write)!==owner)return studyFileError('FORBIDDEN');return result;
    },{maxWait:2000,timeout:6000});
  }
  return {
    tick,
    async list(request:unknown){
      await tick();
      return authorized(request,false,async(tx,owner)=>{
        const rows=await tx.query<{id:string;folder_id:string;title:string;starts_at:Date;notified_at:Date;read_at:Date|null}>(`SELECT s.id,s.folder_id,e.title,s.starts_at,s.notified_at,s.read_at FROM study_review_sessions s
          JOIN study_folders f ON f.id=s.folder_id JOIN agenda_events e ON e.id=s.agenda_event_id AND e.revision=s.event_revision
          WHERE s.owner_id=$1::uuid AND f.owner_id=$1::uuid AND f.status='ACTIVE' AND s.notified_at IS NOT NULL AND s.cancelled_at IS NULL
          ORDER BY s.notified_at DESC,s.id LIMIT 100`,owner);
        const [{unread}]=await tx.query<{unread:bigint}>(`SELECT count(*)::bigint AS unread FROM study_review_sessions s JOIN study_folders f ON f.id=s.folder_id
          WHERE s.owner_id=$1::uuid AND f.status='ACTIVE' AND s.notified_at IS NOT NULL AND s.read_at IS NULL AND s.cancelled_at IS NULL`,owner);
        return {items:rows.map(r=>({id:r.id,title:r.title,folderId:r.folder_id,startsAt:r.starts_at.toISOString(),createdAt:r.notified_at.toISOString(),readAt:r.read_at?.toISOString()??null,href:`/carpetas-de-estudio/${r.folder_id}`})),unreadCount:Number(unread)};
      });
    },
    async read(request:unknown,id:string){
      if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(id))return studyFileError('INVALID_INPUT');
      return authorized(request,true,async(tx,owner)=>{
        const rows=await tx.query(`UPDATE study_review_sessions s SET read_at=COALESCE(read_at,clock_timestamp()) WHERE id=$1::uuid AND owner_id=$2::uuid
          AND notified_at IS NOT NULL AND cancelled_at IS NULL AND EXISTS(SELECT 1 FROM study_folders f WHERE f.id=s.folder_id AND f.owner_id=$2::uuid AND f.status='ACTIVE') RETURNING id`,id,owner);
        if(!rows.length)return studyFileError('FORBIDDEN');return {read:true};
      });
    },
    async close(){closing=true;clearInterval(timer);await pending;},
  };
}
