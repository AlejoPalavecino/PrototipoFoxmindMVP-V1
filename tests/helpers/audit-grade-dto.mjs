const id = 'a1111111-1111-4111-8111-111111111111';
export const gradingView = { revision: '5', archived: false, canSave: true,
 activity: { id, type:'ASSIGNMENT', title:'Fixture', unitId:null, topicId:null, topicIds:[], status:'PUBLISHED', publishedAt:null, deadlineAt:null, allowLate:false, locked:false, zone:'UTC', instructions:null, attachmentRequired:false, instructionFiles:[], materials:[], questions:[] },
 attempt: { id, number:1, submittedAt:'2026-01-01T00:00:00Z', submittedLate:false, firstName:'Fixture', lastName:'Student', attachments:[] },
 grade: { id:null, isPublished:false, publishedAt:null, finalGrade:null, overallFeedback:null, pending:true } };
export const correctionsView = { revision:'5', archived:false, canCorrect:true,
 grade:{id,finalGrade:'8.50',publishedAt:'2026-01-01T00:00:00Z'}, corrections:[] };
export const publishedResult = { status:'pending', attemptId:id };
