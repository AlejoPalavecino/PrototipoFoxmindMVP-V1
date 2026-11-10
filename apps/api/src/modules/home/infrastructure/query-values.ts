export const instant = (expression: string) => `to_char(${expression} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
export const roomJson = `jsonb_build_object('id',c.id,'name',c.name,'division',c.division,'subject',c.subject,
  'role',c.role,'coverKey',c.cover_key,'archived',c.archived_at IS NOT NULL,'timeZone',c.timezone)`;
export const baseJson = (id: string, title: string, target: string) => `jsonb_build_object('id',${id},'title',${title},'classroom',${roomJson},'target',${target})`;
export const targetJson = (kind: string, fields = '') => `jsonb_build_object('kind','${kind}','classroomId',c.id${fields})`;
