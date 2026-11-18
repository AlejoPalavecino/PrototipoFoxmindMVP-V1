// Gemini orders these fields before markdown using the response schema. Require
// that header before decoding any text, and keep the complete JSON on the final path.
const header = /^\s*\{\s*"schemaVersion"\s*:\s*"foxy-text-response-v1"\s*,\s*"status"\s*:\s*"READY"\s*,\s*"title"\s*:\s*"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"\s*,\s*"markdown"\s*:\s*"/u;

export function createFoxyStreamPreview(publish: (markdown: string | undefined) => void) {
  const tokens = /(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*/y;
  let cursor = 0, decoded = '', published = '', done = false;
  function invalidate() {
    done = true;
    if (published) {
      published = '';
      publish(undefined);
    }
  }
  return (json: string | undefined) => {
    if (json === undefined) return invalidate();
    if (done) return;
    if (!cursor) {
      const start = header.exec(json.slice(0, 4096));
      if (!start) {
        if (json.length > 4096) done = true;
        return;
      }
      let title: string;
      try { ({ title } = JSON.parse(start[0] + '"}') as { title: string }); }
      catch { return invalidate(); }
      if (!title.trim() || [...title].length > 200) return invalidate();
      cursor = start[0].length;
    }
    tokens.lastIndex = cursor;
    const next = tokens.exec(json)?.[0] ?? '';
    cursor += next.length;
    const following = json[cursor];
    if (following && following !== '"' && (following !== '\\' || json.length - cursor >= 6)) return invalidate();
    done = following === '"';
    if (next) decoded += JSON.parse('"' + next + '"') as string;
    const complete = decoded.replace(/[\uD800-\uDBFF]$/u, '');
    if ((done && complete !== decoded) || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\p{Surrogate}]/u.test(complete)
      || (complete.length > 50000 && [...complete].length > 50000)) return invalidate();
    if (complete !== published && complete.trim()) {
      published = complete;
      publish(complete);
    }
  };
}
