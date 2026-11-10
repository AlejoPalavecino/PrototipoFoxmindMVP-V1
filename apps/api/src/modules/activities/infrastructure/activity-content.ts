import { randomUUID } from 'node:crypto';
import type { Transaction } from '../../classrooms/public.ts';
import type { ActivityPayload } from '../domain/activity-policy.ts';

export async function replaceActivityContent(tx: Transaction, row: { id: string; classroom_id: string }, payload: ActivityPayload) {
  // Reachable only before first participation, under the same classroom lock used by starts.
  await tx.query('DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE activity_id=$1::uuid) RETURNING id', row.id);
  await tx.query('DELETE FROM questions WHERE activity_id=$1::uuid RETURNING id', row.id);
  await tx.query('DELETE FROM activity_instruction_files WHERE activity_id=$1::uuid RETURNING file_id', row.id);
  await tx.query('DELETE FROM activity_materials WHERE activity_id=$1::uuid RETURNING material_id', row.id);
  for (const file of payload.instructionFileIds) await tx.query(`INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id)
    VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING file_id`, row.id, row.classroom_id, file);
  for (const material of payload.materialIds) await tx.query(`INSERT INTO activity_materials(activity_id,classroom_id,material_id)
    VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING material_id`, row.id, row.classroom_id, material);
  for (const [position, q] of payload.questions.entries()) {
    const id = randomUUID();
    await tx.query(`INSERT INTO questions(id,updated_at,activity_id,type,prompt,position,available_points,scoring_rule)
      VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::"QuestionType",$4,$5,$6::numeric,$7::"ScoringRule") RETURNING id`,
      id, row.id, q.type, q.prompt, position, q.points, q.scoringRule);
    for (const [optionPosition, option] of q.options.entries()) await tx.query(`INSERT INTO question_options(id,updated_at,question_id,text,position,is_correct)
      VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4,$5) RETURNING id`, randomUUID(), id, option.text, optionPosition, option.correct);
  }
}
