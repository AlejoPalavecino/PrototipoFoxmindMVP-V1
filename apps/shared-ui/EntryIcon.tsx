/** Locally vendored Bootstrap Icons; decorative, labels remain in the controls. */
export function EntryIcon({ name }: { name: string }) {
  return <span className="entry-icon" aria-hidden="true" style={{ maskImage: `url(/entry-glass/icons/${name}.svg)`, WebkitMaskImage: `url(/entry-glass/icons/${name}.svg)` }} />;
}
