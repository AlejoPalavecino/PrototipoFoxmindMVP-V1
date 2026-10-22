export interface MarkerRect { x: number; y: number; width: number }
export function markerFrames(from: MarkerRect, to: MarkerRect, reduced: boolean) {
  if (reduced || !from.width || !to.width || (from.x === to.x && from.y === to.y && from.width === to.width)) return null;
  return [{ transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scaleX(${from.width / to.width})` }, { transform: 'none' }];
}
