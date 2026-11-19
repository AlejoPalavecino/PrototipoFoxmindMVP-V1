import { studyFail, studyId, studyObject } from './folders.ts';

export const SHARED_STUDY_STRATEGY_MAX_CHARS = 1000;

export function parsePutSharedStudyStrategy(input: unknown) {
  const body = studyObject(input);
  if (Object.keys(body).length !== 2 || !Object.hasOwn(body, 'classroomId') || !Object.hasOwn(body, 'text')) {
    return studyFail('INVALID_INPUT');
  }
  const classroomId = studyId(body.classroomId).toLowerCase();
  const text = body.text;
  if (typeof text !== 'string' || !text.trim() || [...text].length > SHARED_STUDY_STRATEGY_MAX_CHARS
    || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]|\p{Cs}/u.test(text)) {
    return studyFail('INVALID_INPUT');
  }
  return { classroomId, text };
}
