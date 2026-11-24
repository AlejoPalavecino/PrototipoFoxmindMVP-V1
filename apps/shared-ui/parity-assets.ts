/** One illustration per catalog cover. Legacy keys keep a stable visual equivalent. */
const catalogCovers = new Set(['literature', 'math', 'biology', 'society', 'science', 'creative', 'general']);
const legacyCovers: Record<string, string> = { create: 'creative', explore: 'general', discover: 'science' };
export function learningCover(key?: string) {
  const name = key && catalogCovers.has(key) ? key : (key && legacyCovers[key]) ?? 'general';
  return `/foxmind-3d/covers/${name}-640.webp`;
}
