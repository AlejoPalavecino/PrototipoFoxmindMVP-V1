export function formatFoxyModelMarkdown(markdown: string): string {
  // Normalize legacy provider output with serialized line breaks. Keep inline code and authored edits intact.
  if (markdown.includes('\n') || !/\\n(?:\\n|\s*#{1,6}\s)/u.test(markdown)) return markdown;
  return markdown.split(/(`+[^`]*`+)/u).map((part, index) =>
    index % 2 ? part : part.replace(/\\r\\n|\\n/gu, '\n')
  ).join('');
}
