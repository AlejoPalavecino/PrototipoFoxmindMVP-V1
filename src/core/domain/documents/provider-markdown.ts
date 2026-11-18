/** Repair structural breaks double-escaped by a provider after JSON decoding. */
export function resourceMarkdown(markdown: string): string {
  if (!markdown.includes('\\n')) return markdown;
  const code = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/gu;
  return markdown.split(code).map((part, index) => index % 2 ? part : part
    .replace(/(?<!\\)(?:(?:\\r)?\\n){2,}/gu, '\n\n')
    .replace(/(?<!\\)(?:\\r)?\\n(?=[ \t]*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s))/gu, '\n')
  ).join('');
}
