// Check reachability separately for each kind of dependency path.
export function cycleEdges(edges) {
  const classes = [
    ['eager', edge => edge.mode === 'eager'],
    ['deferred', edge => edge.mode !== 'type'],
    ['type-only', edge => edge.mode === 'type'],
    ['mixed', () => true],
  ];
  const classified = new Map();
  for (const [kind, includes] of classes) {
    const eligible = edges.filter(includes);
    const graph = new Map();
    for (const { file, target } of eligible) {
      if (!graph.has(file)) graph.set(file, new Set());
      graph.get(file).add(target);
    }
    const reachability = new Map();
    function reachable(start) {
      if (reachability.has(start)) return reachability.get(start);
      const seen = new Set();
      const pending = [...(graph.get(start) ?? [])];
      while (pending.length) {
        const next = pending.pop();
        if (seen.has(next)) continue;
        seen.add(next);
        pending.push(...(graph.get(next) ?? []));
      }
      reachability.set(start, seen);
      return seen;
    }
    for (const edge of eligible) {
      if (!classified.has(edge) && reachable(edge.target).has(edge.file)) classified.set(edge, kind);
    }
  }
  return [...classified].map(([edge, kind]) => [edge, `${kind} cycle`]);
}
