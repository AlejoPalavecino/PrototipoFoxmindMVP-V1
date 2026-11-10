import type { FoxyDiagram } from '../../../../../../src/core/domain/index.ts';

function limit(): never { throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' }); }
function escape(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;').replace(/'/gu, '&apos;');
}
function lines(value: string, width: number, height: number, fontSize: number): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const capacity = Math.floor(width / (fontSize * 1.1));
  const maxLines = Math.floor(height / (fontSize * 1.3));
  if (capacity < 1 || maxLines < 1) return limit();
  const result: string[] = []; let current = ''; let used = 0;
  for (const { segment } of segmenter.segment(value)) {
    const cost = [...segment].length;
    if (cost > capacity) return limit();
    if (segment === '\n' || used + cost > capacity) {
      result.push(current); current = segment === '\n' ? '' : segment;
      used = segment === '\n' ? 0 : cost;
    } else { current += segment; used += cost; }
  }
  result.push(current);
  if (result.length > maxLines) return limit();
  return result;
}
function text(value: string, x: number, y: number, width: number, height: number, size: number, weight = 400): string {
  const wrapped = lines(value, width, height, size);
  return `<text x="${x}" y="${y + size}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="#202c35">${wrapped.map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.3 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}
function connections(diagram: FoxyDiagram, margin: number, top: number, columns: number, cellW: number, cellH: number, gap: number): string {
  const indexById = new Map(diagram.nodes.map((node, index) => [node.id, index]));
  return diagram.edges.map(edge => {
    const a = indexById.get(edge.from)!, b = indexById.get(edge.to)!;
    const position = (index: number) => ({ x: margin + (index % columns) * cellW + (cellW - gap) / 2,
      y: top + Math.floor(index / columns) * cellH + (cellH - gap) / 2 });
    const start = position(a), end = position(b);
    if (a === b) {
      const x = start.x + (cellW - gap) / 2 - 12, y = start.y - (cellH - gap) / 2;
      return `<path d="M ${x - 18} ${y} C ${x - 18} ${y - 24}, ${x + 18} ${y - 24}, ${x + 18} ${y}" fill="none" stroke="#718d85" stroke-width="2"/>`;
    }
    const dx = end.x - start.x, dy = end.y - start.y, distance = Math.hypot(dx, dy), ux = dx / distance, uy = dy / distance;
    const offset = Math.min(ux === 0 ? Infinity : (cellW - gap) / (2 * Math.abs(ux)), uy === 0 ? Infinity : (cellH - gap) / (2 * Math.abs(uy)));
    const tx = end.x - ux * (offset + 2), ty = end.y - uy * (offset + 2);
    const bx = tx - ux * 10, by = ty - uy * 10;
    return `<line x1="${start.x}" y1="${start.y}" x2="${tx}" y2="${ty}" stroke="#718d85" stroke-width="2"/><polygon points="${tx},${ty} ${bx - uy * 4},${by + ux * 4} ${bx + uy * 4},${by - ux * 4}" fill="#718d85"/>`;
  }).join('');
}
export function createDiagramSvg(diagram: FoxyDiagram, width: number, height: number): string {
  const margin = 56, edgeCols = 3, edgeRows = Math.ceil(diagram.edges.length / edgeCols);
  const titleHeight = Math.max(70, Math.ceil(lines(diagram.title, width - margin * 2, 10000, 30).length * 39 + 8));
  const top = margin + titleHeight + 20;
  const ids = new Map(diagram.nodes.map((node, index) => [node.id, index + 1]));
  const edgeW = (width - margin * 2) / edgeCols;
  const labels = diagram.edges.map(edge => `${ids.get(edge.from)} → ${ids.get(edge.to)}${edge.label ? `  ${edge.label}` : ''}`);
  const rowHeights = Array.from({ length: edgeRows }, (_, row) => Math.max(22, ...labels.filter((_, index) => index % edgeRows === row).map(label => Math.ceil(lines(label, edgeW - 20, 10000, 14).length * 18.2 + 1))));
  const edgeHeight = edgeRows ? 44 + rowHeights.reduce((a, b) => a + b, 0) : 0;
  const columns = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(diagram.nodes.length * (diagram.direction === 'LEFT_RIGHT' ? 1.5 : 0.7)))));
  const rows = Math.ceil(diagram.nodes.length / columns), gap = rows > 3 ? 10 : 28;
  const cellW = Math.min(340, (width - margin * 2) / columns);
  const nodeFont = rows <= 3 ? 20 : 16;
  const longest = Math.max(...diagram.nodes.map((node, index) => lines(`${index + 1}. ${node.label}`, cellW - gap - 28, 10_000, nodeFont).length));
  const requiredHeight = longest * nodeFont * 1.3 + gap + 20;
  const cellH = Math.min(Math.max(100, requiredHeight), (height - top - margin - edgeHeight) / rows);
  const left = (width - columns * cellW) / 2, nodeHeight = rows * cellH;
  const boxes = diagram.nodes.map((node, index) => {
    const x = left + (index % columns) * cellW, y = top + Math.floor(index / columns) * cellH;
    return `<rect x="${x}" y="${y}" width="${cellW-gap}" height="${cellH-gap}" rx="8" fill="#f0f5f4" stroke="#a6b9b3"/>${text(`${index + 1}. ${node.label}`, x + 14, y + 10, cellW - gap - 28, cellH - gap - 20, nodeFont, 600)}`;
  }).join('');
  const edges = diagram.edges.map((edge, index) => {
    const row = index % edgeRows, x = margin + Math.floor(index / edgeRows) * edgeW, y = top + nodeHeight + 36 + rowHeights.slice(0, row).reduce((a, b) => a + b, 0);
    return text(labels[index], x, y, edgeW - 20, rowHeights[row] - 1, 14);
  }).join('');
  const edgeTitle = edgeRows ? text('Relaciones', margin, top + nodeHeight + 4, width - margin * 2, 28, 18, 600) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${text(diagram.title, margin, margin - 8, width - margin * 2, titleHeight - 8, 30, 700)}${connections(diagram, left, top, columns, cellW, cellH, gap)}${boxes}${edgeTitle}${edges}</svg>`;
}
