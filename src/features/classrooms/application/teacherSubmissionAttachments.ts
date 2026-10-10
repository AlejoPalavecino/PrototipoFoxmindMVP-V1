import type { Submission, SubmissionFileMetadata } from '../model/Submission';

export type TeacherSubmissionAttachment = SubmissionFileMetadata & { file?: File };

export function getTeacherSubmissionAttachments(submission: Submission): TeacherSubmissionAttachment[] {
  // An explicit empty list means text-only; never revive a stale first-file projection.
  return submission.attachments ?? (submission.attachedFile ? [submission.attachedFile] : []);
}

export interface SubmissionDownloadPorts {
  createObjectURL: (file: File) => string;
  revokeObjectURL: (url: string) => void;
  triggerDownload: (url: string, name: string) => void;
  deferCleanup: (cleanup: () => void) => void;
}

// Browser operations are lazy and replaceable for deterministic byte/cleanup tests.
const browserDownloads: SubmissionDownloadPorts = {
  createObjectURL: file => URL.createObjectURL(file),
  revokeObjectURL: url => URL.revokeObjectURL(url),
  triggerDownload: (url, name) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  },
  // Allow the browser's dispatched download to consume the URL before revocation.
  deferCleanup: cleanup => { setTimeout(cleanup, 1000); },
};

export function downloadTeacherSubmissionAttachment(
  attachment: TeacherSubmissionAttachment,
  ports: SubmissionDownloadPorts = browserDownloads,
): boolean {
  if (!attachment.file) return false; // Display-only fixtures cannot supply original bytes.
  const url = ports.createObjectURL(attachment.file);
  try {
    ports.triggerDownload(url, attachment.file.name);
    ports.deferCleanup(() => ports.revokeObjectURL(url));
    return true;
  } catch (error) {
    ports.revokeObjectURL(url);
    throw error;
  }
}
