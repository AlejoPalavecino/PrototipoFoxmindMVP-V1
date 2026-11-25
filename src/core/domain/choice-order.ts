// Models tend to write the correct option first. Generated choice questions are
// reordered once, when they are created, so the key is not revealed by position.
// The order is derived from the content, so it is reproducible and survives re-reads.
function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function generator(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function arrangeChoices<T>(items: readonly T[], seed: string): T[] {
  const next = generator(seedFrom(seed));
  const arranged = [...items];
  for (let index = arranged.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [arranged[index], arranged[swap]] = [arranged[swap]!, arranged[index]!];
  }
  return arranged;
}
