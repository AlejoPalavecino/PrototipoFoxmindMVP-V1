/** Restore focus after React removes a modal, unless navigation chose a new target. */
export function openDialog(dialog: HTMLDialogElement) {
  const doc = dialog.ownerDocument;
  const trigger = doc.activeElement as HTMLElement | null;
  dialog.showModal();
  return () => {
    dialog.close();
    queueMicrotask(() => {
      if (trigger?.isConnected && (doc.activeElement === doc.body || dialog.contains(doc.activeElement))) {
        trigger.focus({ preventScroll: true });
      }
    });
  };
}
