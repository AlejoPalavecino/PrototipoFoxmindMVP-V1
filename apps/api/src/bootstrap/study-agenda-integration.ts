import {randomUUID} from 'node:crypto';
import { createPrivateEventRepository } from '../modules/agenda/infrastructure/event-repository.ts';
import type { StudyOptions } from '../modules/study/application/contracts.ts';
import { studySessionEvent } from '../modules/study/infrastructure/folders/reminders/session-event.ts';

function fail(code='INVALID_INPUT'):never{throw Object.assign(new Error(code),{code});}
export function createStudyAgendaIntegration():NonNullable<StudyOptions['agenda']> {
  return {
    async confirm(tx,ownerId,folderId,examInput,sessions,requestId) {
      void requestId;
      const exam=examInput as Record<string,unknown>,events=createPrivateEventRepository(tx,ownerId),result=[];
      if(sessions.length>200)fail();
      const seen=new Set<string>();
      for(const raw of sessions){
        const session=raw as Record<string,unknown>,id=String(session.id);
        if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(id)||seen.has(id))fail();seen.add(id);
        const payload=studySessionEvent(exam,session),snapshot=JSON.stringify(payload);
        const reminder=session.reminderMinutes??null;
        if(![null,0,15,60,1440].includes(reminder as number|null)||Date.parse(String(session.startAt))<=Date.now())fail();
        const [existing]=await tx.query<{owner_id:string;folder_id:string;agenda_event_id:string|null;event_revision:bigint;event_snapshot:unknown}>(
          'SELECT * FROM study_review_sessions WHERE id=$1::uuid FOR UPDATE',id);
        if(existing&&(existing.owner_id!==ownerId||existing.folder_id!==folderId))fail('FORBIDDEN');
        let event;
        if(existing){
          if(!existing.agenda_event_id)fail('CONFLICT');
          const current=await events.get(existing.agenda_event_id);
          if(!current||current.revision!==String(existing.event_revision))fail('CONFLICT');
          // Compare structural payload, not JSON object order returned by jsonb.
          const same=JSON.stringify({title:current.title,description:current.description,category:current.category,schedule:current.schedule,repeat:current.repeat})===snapshot;
          event=same?current:await events.replace(current.id,current.revision,payload);
        }else event=await events.create(randomUUID(),payload);
        await tx.query(`INSERT INTO study_review_sessions(id,owner_id,folder_id,exam_id,agenda_event_id,event_revision,event_snapshot,starts_at,ends_at,reminder_minutes,notify_at)
          VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::bigint,$7::jsonb,$8::timestamptz,$9::timestamptz,$10::int,
          CASE WHEN $10::int IS NULL THEN NULL ELSE $8::timestamptz - ($10::int * interval '1 minute') END)
          ON CONFLICT(id) DO UPDATE SET agenda_event_id=EXCLUDED.agenda_event_id,event_revision=EXCLUDED.event_revision,event_snapshot=EXCLUDED.event_snapshot,
          starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,reminder_minutes=EXCLUDED.reminder_minutes,notify_at=EXCLUDED.notify_at,
          notified_at=CASE WHEN study_review_sessions.starts_at=EXCLUDED.starts_at AND study_review_sessions.reminder_minutes IS NOT DISTINCT FROM EXCLUDED.reminder_minutes THEN study_review_sessions.notified_at ELSE NULL END,
          read_at=CASE WHEN study_review_sessions.starts_at=EXCLUDED.starts_at AND study_review_sessions.reminder_minutes IS NOT DISTINCT FROM EXCLUDED.reminder_minutes THEN study_review_sessions.read_at ELSE NULL END,
          cancelled_at=NULL,updated_at=clock_timestamp() RETURNING id`,id,ownerId,folderId,String(exam.id),event.id,event.revision,snapshot,String(session.startAt),String(session.endAt),reminder);
        result.push({sessionId:id,eventId:event.id,revision:event.revision});
      }
      return {events:result};
    },
    async cancel(tx,owner,folder){await tx.query('UPDATE study_review_sessions SET cancelled_at=clock_timestamp(),updated_at=clock_timestamp() WHERE owner_id=$1::uuid AND folder_id=$2::uuid AND cancelled_at IS NULL RETURNING id',owner,folder);},
  };
}
