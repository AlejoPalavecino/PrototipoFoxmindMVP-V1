'use client';

// A URL is a consultation destination. Only a local response action can grant
// this short-lived, single-use intent; it is never stored in browser storage.
let pending:{classroomId:string;activityId:string;expiresAt:number}|null=null;
export function grantActivityResponse(classroomId:string,activityId:string){pending={classroomId,activityId,expiresAt:Date.now()+15000};}
export function consumeActivityResponse(classroomId:string,activityId:string){
 const intent=pending;pending=null;
 return Boolean(intent&&intent.classroomId===classroomId&&intent.activityId===activityId&&intent.expiresAt>=Date.now());
}
