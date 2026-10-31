const normalize = text => text.trim().replace(/\s+/g, ' ').toLowerCase();
export function visibleLines(text, keepCode = false) {
  let fence = null;
  text = text.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\r\n]/g, ''));
  return text.split(/\r?\n/).map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length) fence = null;
      return '';
    }
    return fence ? '' : line.replace(/(`+)([\s\S]*?)\1/g, keepCode ? '$2' : '');
  });
}
export function anchors(text) {
  const lines = visibleLines(text, true), idLines = visibleLines(text), result = new Set(), counts = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const match of idLines[i].matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) result.add(match[1]);
    let title = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (!title && i + 1 < lines.length && /^\s{0,3}(?:=+|-+)\s*$/.test(lines[i + 1]) && line.trim()) title = line.trim();
    if (!title) continue;
    const slug = title.replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/ /g, '-');
    const count = counts.get(slug) ?? 0; counts.set(slug, count + 1); result.add(count ? `${slug}-${count}` : slug);
  }
  return result;
}
export function links(text) {
  const lines = visibleLines(text), definitions = new Map(), output = [];
  for (const line of lines) {
    const m = line.match(/^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/);
    if (m && !definitions.has(normalize(m[1]))) definitions.set(normalize(m[1]), m[2] ?? m[3]);
  }
  lines.forEach((line, index) => {
    if (/^\s{0,3}\[[^\]]+\]:/.test(line)) return;
    const pattern = /!?\[([^\]]*)\](?:\((<[^>]*>|(?:[^()\s]|\([^()]*\))*)(?:\s+["'][^"']*["'])?\)|\[([^\]]*)\])/g;
    for (const m of line.matchAll(pattern)) {
      const ref = m[3] !== undefined ? normalize(m[3] || m[1]) : null;
      output.push({ line: index + 1, target: ref === null ? m[2].replace(/^<|>$/g, '') : definitions.get(ref), reference: ref });
    }
  });
  return output;
}
