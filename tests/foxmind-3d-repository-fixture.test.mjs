import { randomUUID } from 'node:crypto';

// Every caller runs this against an owned *_test transaction that is rolled back.
export async function homeFixture(query) {
  const [actor, other, pupil, outsider] = Array.from({ length: 4 }, () => randomUUID());
  const now = (await query('SELECT now() at'))[0].at.toISOString();
  const at = days => new Date(Date.parse(now) + days * 86400000).toISOString();
  for (const id of [actor, other, pupil, outsider]) await query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
    VALUES($1,now(),$2,$2,'Synthetic','Home','not-a-login',now())`, id, `${id}@example.test`);
  const rooms = {};
  for (const [name, teacher, student, archived] of [
    ['study', other, actor, false], ['teach', actor, pupil, false],
    ['foreign', other, pupil, false], ['archived', actor, pupil, true],
  ]) {
    const [id, unit, topic, enrollment, period] = Array.from({ length: 5 }, () => randomUUID());
    await query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,archived_at)
      VALUES($1,now(),$2,$3,'Ciencias','A',2026,'UTC','explore',1000000,CASE WHEN $4 THEN now() ELSE NULL END)`, id, teacher, name, archived);
    await query("INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unidad',0)", unit, id);
    await query("INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Tema',0)", topic, id, unit);
    await query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', enrollment, id, student);
    await query("INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')", period, enrollment, id);
    rooms[name] = { id, unit, topic, teacher, student, enrollment, period };
  }
  for (const owner of [actor, other]) await query(`INSERT INTO classroom_drafts(id,updated_at,owner_id,payload)
    VALUES($1,now(),$2,'{}'::jsonb)`, randomUUID(), owner);
  await query(`INSERT INTO invitations(id,updated_at,classroom_id,recipient_email_normalized,invited_by_id,expires_at)
    VALUES($1,now(),$2,$3,$4,$5)`, randomUUID(), rooms.foreign.id, `${actor}@example.test`, other, at(1));

  async function activity(name = 'study', options = {}) {
    const r = rooms[name], id = randomUUID(), obligation = randomUUID();
    const { title = `Actividad ${id}`, deadline = at(1), status = 'PUBLISHED', expected = true,
      firstDeadline = null, allowLate = false } = options;
    await query(`INSERT INTO activities(id,updated_at,classroom_id,unit_id,topic_id,type,title,status,published_at,deadline_at,allow_late_submissions)
      VALUES($1,now(),$2,$3,$4,'ASSIGNMENT',$5,$6::"ActivityStatus",CASE WHEN $6::text='PUBLISHED' THEN now() ELSE NULL END,$7,$8)`,
    id, r.id, r.unit, r.topic, title, status, deadline, allowLate);
    await query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason,first_submission_deadline_at)
      VALUES($1,now(),$2,$3,$4,$5,'INITIAL_ENROLLMENT',$6)`, obligation, r.id, r.enrollment, id, expected, firstDeadline);
    return { id, obligation, room: r.id, teacher: r.teacher };
  }
  async function attempt(a, options = {}) {
    const id = randomUUID(), { number = 1, submitted = true, individualDeadline = null } = options;
    await query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,enabled_by_id,individual_deadline_at,
      opened_at,submitted_at,applied_deadline_at,submitted_late)
      VALUES($1,now(),$2,$3,$4,$5,CASE WHEN $4>1 THEN $6::uuid ELSE NULL END,$7,$8,
      CASE WHEN $9 THEN $8::timestamptz ELSE NULL END,CASE WHEN $9 THEN $10::timestamptz ELSE NULL END,
      CASE WHEN $9 THEN false ELSE NULL END)`, id, a.obligation, a.id, number, submitted ? 'SUBMITTED' : 'DRAFT', a.teacher,
    individualDeadline, at(-1), submitted, at(1));
    return id;
  }
  async function grade(a, attemptId, options = {}) {
    const id = randomUUID(), { value = '0', published = false, effective = false } = options;
    await query(`INSERT INTO attempt_grades(id,updated_at,attempt_id,student_activity_id,activity_id,graded_by_id,final_grade,is_published,published_at)
      VALUES($1,now(),$2,$3,$4,$5,$6,$7,CASE WHEN $7 THEN now() ELSE NULL END)`, id, attemptId, a.obligation, a.id, a.teacher, value, published);
    if (effective) await query('UPDATE student_activities SET effective_grade_id=$2 WHERE id=$1', a.obligation, id);
    return id;
  }
  async function post(name = 'teach', options = {}) {
    const r = rooms[name], id = randomUUID(), { type = 'QUERY', removed = false, body = 'Consulta sintética' } = options;
    await query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,removed_at,removed_by_id)
      VALUES($1,now(),$2,$3,$4,$5,CASE WHEN $6 THEN now() ELSE NULL END,CASE WHEN $6 THEN $7::uuid ELSE NULL END)`,
    id, r.id, r.student, type, body, removed, r.teacher);
    return id;
  }
  async function material(name = 'study', { clean = true } = {}) {
    const r = rooms[name], id = randomUUID(), fileId = randomUUID(), digest = 'a'.repeat(64);
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',14,
      'APPROVED','CLEAN',now(),now())`, fileId, r.id, r.teacher, `synthetic-home/${fileId}`);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), fileId);
    await query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
      VALUES($1,'material','ready',$2,$2,$2)`, fileId, digest);
    await query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id)
      VALUES($1,now(),$2,'Material sintético',$3,$4)`, id, r.id, fileId, r.teacher);
    if (!clean) await query("UPDATE files SET scan_status='ERROR' WHERE id=$1", fileId);
    return id;
  }
  async function event({ days = 1, owner = actor, allDay = false } = {}) {
    const id = randomUUID(), start = new Date(Math.floor(Date.parse(at(days)) / 60000) * 60000).toISOString();
    const end = new Date(Date.parse(start) + 3600000).toISOString();
    const date = start.slice(0, 10), next = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    await query(`INSERT INTO agenda_events(id,owner_id,title,description,category,schedule_kind,start_date,end_date_exclusive,
      start_local,end_local,time_zone,start_at,end_at,repeat_kind)
      VALUES($1,$2,'Evento sintético','Descripción privada fuera del resumen','CLASS',$3,$4,$5,$6,$7,$8,$9,$10,'NONE')`,
    id, owner, allDay ? 'ALL_DAY' : 'TIMED', date, next, allDay ? null : start.slice(0, 16), allDay ? null : end.slice(0, 16),
    allDay ? null : 'UTC', allDay ? null : start, allDay ? null : end);
    return id;
  }
  return { actor, other, pupil, outsider, rooms, now, at, query, activity, attempt, grade, post, material, event };
}
