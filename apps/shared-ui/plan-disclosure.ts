const initialized = new WeakSet<HTMLDetailsElement>();

/** Initialize once; subsequent edits must preserve the student's native toggle. */
export function initializePlanDisclosure(node: HTMLDetailsElement | null, initiallyOpen: boolean) {
  if (!node || initialized.has(node)) return;
  initialized.add(node);
  node.open = initiallyOpen;
}
