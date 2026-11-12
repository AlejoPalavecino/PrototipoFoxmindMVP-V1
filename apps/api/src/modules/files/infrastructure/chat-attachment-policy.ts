export const CHAT_ATTACHMENT_BYTES = 20_000_000;
export const CHAT_ATTACHMENT_COUNT = 6;

export function attachmentError(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function parseChatAttachmentIntent(value: string | undefined, copyValue: string | undefined, student: boolean) {
  const name = value?.trim() ?? '';
  const extension = /\.(pdf|docx)$/iu.exec(name)?.[1]?.toLowerCase();
  if (!extension || [...name].length > 120 || /[/\\\u0000-\u001f\u007f-\u009f]/u.test(value ?? '')
    || !name.slice(0, name.lastIndexOf('.')).trim() || (copyValue !== undefined && (copyValue !== '1' || !student))) {
    return attachmentError('INVALID_INPUT');
  }
  return { name, extension: extension as 'pdf' | 'docx', copy: copyValue === '1' };
}
