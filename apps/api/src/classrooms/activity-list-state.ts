import {receptionPolicy} from './attempt-policy.ts';

export interface StudentActivityListRow {
  activity_id:string;status:'DRAFT'|'SUBMITTED'|null;number:number|null;published:boolean;
  individual_deadline:Date|null;first_deadline:Date|null;
  expected:boolean;
}
export function studentActivityState(activity:{deadline_at:Date|null;allow_late_submissions:boolean},attempt:StudentActivityListRow|undefined,now:Date){
  if(!attempt?.expected)return 'READ_ONLY' as const;
  if(attempt?.status==='DRAFT'&&(attempt.number??0)>1)return 'RESUBMISSION' as const;
  if(attempt?.published)return 'REVIEWED' as const;
  if(attempt?.status==='SUBMITTED')return 'SUBMITTED' as const;
  if(attempt?.status==='DRAFT')return 'DRAFT' as const;
  return receptionPolicy(activity.deadline_at,attempt?.individual_deadline??attempt?.first_deadline??null,activity.allow_late_submissions,now).open?'PENDING' as const:'CLOSED' as const;
}
