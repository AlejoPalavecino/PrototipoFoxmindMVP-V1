/** Approved local artwork. Legacy cover keys retain a stable visual equivalent. */
export function learningCover(key?: string) {
  const name = key === 'biology' || key === 'science' ? 'biology' : key === 'math' ? 'math' : key === 'literature' || key === 'creative' || key === 'create' ? 'literature' : 'classroom-world';
  return `/foxmind/${name}.webp`;
}
