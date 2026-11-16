export function studyReviewHref(target: { folderId: string; examId: string }) {
  return `/carpetas-de-estudio/${encodeURIComponent(target.folderId)}?tab=repaso&exam=${encodeURIComponent(target.examId)}`;
}
