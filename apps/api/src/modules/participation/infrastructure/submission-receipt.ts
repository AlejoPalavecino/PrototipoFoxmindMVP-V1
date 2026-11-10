/** Server-only timestamps. Client headers/body fields never participate in receipt attribution. */
const completedBodies = new WeakMap<object, number>();

/** Called on the original IncomingMessage only after its complete JSON body arrives. */
export function captureSubmissionReceipt(request: object): Date {
  let instant = completedBodies.get(request);
  if (instant === undefined) { instant = Date.now(); completedBodies.set(request, instant); }
  return new Date(instant);
}

/** Direct domain callers capture at method entry; production HTTP already recorded the completed-body receipt. */
export function submissionReceipt(request: unknown): Date {
  if (!request || typeof request !== 'object') throw new Error('A server request is required.');
  return captureSubmissionReceipt(request);
}
