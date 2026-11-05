/** Decorative vectors copied from the approved Brújula reference. */
export function BrujulaIcon({name}:{name:'school'|'graduation-cap'|'compass'}) {
  return <svg className="brujula-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><use href={`/brujula/icons.svg#${name}`}/></svg>;
}
