// Plot has no arc mark, so a donut is drawn here with d3-shape, which Plot's own
// d3 dependency includes. Output is an SVG string filled with CSS variables:
// themes need no JavaScript, and the data stays in the page that holds it.
//
// A donut is for part-to-whole at a glance. To compare close values, use bars.

import { arc, pie } from 'd3-shape';
import { chrome } from './theme.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// First slice starts at 12 o'clock and runs clockwise, largest first: the input
// order is kept, because a sort would change which slice sits beside which.
export const slices = (data, { inner, outer, gap = 2 }) => {
  const layout = pie().sort(null).value((d) => d.value);
  // The gap is a fixed width of surface, so the pad angle comes from the mid radius.
  const mid = (inner + outer) / 2;
  const shape = arc().innerRadius(inner).outerRadius(outer).padAngle(gap / mid).padRadius(mid);
  return layout(data).map((a) => ({
    ...a.data,
    path: shape(a),
    mid: (a.startAngle + a.endAngle) / 2,
  }));
};

// Colour: an explicit `color` per datum, otherwise chrome.neutral. Identity is
// never colour alone: the caller lists every slice beside the ring.
const fill = (d) => d.color ?? chrome.neutral;

const ring = (parts, cx, cy) =>
  `<g transform="translate(${cx} ${cy})">` +
  parts.map((p) => `<path d="${p.path}" fill="${fill(p)}"><title>${esc(p.label)}: ${esc(p.valueLabel ?? p.value)}</title></path>`).join('') +
  '</g>';

const centre = (title, cx, cy, size, leading) => {
  const y0 = cy - ((title.length - 1) * leading) / 2;
  return title
    .map((line, i) => `<text x="${cx}" y="${y0 + i * leading}" text-anchor="middle" dominant-baseline="central" font-family="var(--font-display)" font-weight="600" font-size="${size}" fill="${chrome.text}">${esc(line)}</text>`)
    .join('');
};

// The ring alone. Labels go in an HTML list beside it, where they keep their real
// size: text inside an SVG shrinks with the column.
export const donutRing = (data, { size = 320, outer = 156, inner = 108, title = [], fontSize = 20 } = {}) => {
  const c = size / 2;
  return (
    `<svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" aria-hidden="true" focusable="false">` +
    ring(slices(data, { inner, outer }), c, c) +
    centre(title, c, c, fontSize, fontSize * 1.25) +
    '</svg>'
  );
};

export const swatch = fill;
