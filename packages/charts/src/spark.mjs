// A sparkline: a small chart beside a figure, for the shape of its recent run and nothing more.
// Bars, a line or an area, from zero, with a reference dashed across it when it falls inside, such
// as a benchmark or a target. No axes, no labels, no pointer: the figure beside it says the number.
//
// Output is an SVG string with classes, not colours: ./spark.css colours it from `--tone` on the
// spark or any parent, so a card sets its tone once for its badge and its spark. A string, so the
// same spark draws at build time and in the page.
//
//     import { sparkline } from '@n1kname/charts/spark';
//     import '@n1kname/charts/spark.css';
//
//     card.insertAdjacentHTML('beforeend', sparkline([7.1, 7.4, 6.8, 7.9], { kind: 'line', reference: 7 }));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => +v.toFixed(2);
const has = (v) => typeof v === 'number' && Number.isFinite(v);

export const SPARK_KINDS = ['bar', 'line', 'area'];

// values: numbers, oldest first; a missing one (null) is a gap. kind: 'bar', 'line' or 'area'.
// reference: a value dashed across, drawn only when it falls inside the scale. width and height in
// px. label: what a screen reader hears; without one the spark is hidden from it, because the
// figure beside it says the same. last: a dot on the newest value of a line or area, the newest
// one there is when the run ends in gaps. zero: false for a line or area scaled to its own
// values, for a rate that only moves a little; bars always stand on zero. compare: a second run
// over the same steps, such as the same months a year earlier, drawn as a quiet line under the
// marks and on the same scale, so the two can be read against each other.
export const sparkline = (values, { kind = 'bar', reference, width = 72, height = 44, label, last = false, zero = true, compare } = {}) => {
  const other = Array.isArray(compare) ? compare : [];
  if (other.length > values.length) values = [...values, ...Array(other.length - values.length).fill(null)];
  const shown = [...values, ...other].filter(has);
  if (!values.some(has)) return '';
  if (!SPARK_KINDS.includes(kind)) throw new Error(`sparkline: kind is one of ${SPARK_KINDS.join(', ')}, not ${kind}`);
  // From zero, with a little headroom so the top bar or the peak doesn't touch the edge. Below
  // zero when a value is. Without zero, the values' own range with a tenth of it either side.
  const own = !zero && kind !== 'bar';
  const spread = Math.max(...shown) - Math.min(...shown) || Math.abs(shown[0]) || 1;
  const lo = own ? Math.min(...shown) - spread * 0.1 : Math.min(0, ...shown);
  const hi = own ? Math.max(...shown) + spread * 0.1 : Math.max(0, ...shown) * 1.05 || 1;
  const [l, r, t, b] = [2, 2, 4, 2];
  const iw = width - l - r;
  const ih = height - t - b;
  const y = (v) => t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  // What bars stand on and an area closes on: zero, or the scale's foot when zero is below it.
  const base = y(Math.max(lo, Math.min(0, hi)));
  // Where step i stands across: a bar's middle, or a point along a line.
  const band = iw / values.length;
  const step = values.length > 1 ? iw / (values.length - 1) : 0;
  const xAt = (i) => (kind === 'bar' ? l + band * i + band / 2 : values.length > 1 ? l + step * i : l + iw / 2);
  const line = (pts) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${n(px)} ${n(py)}`).join('');
  const runsOf = (vs) => {
    const runs = [];
    vs.forEach((v, i) => {
      if (!has(v)) return runs.push(null);
      const p = [xAt(i), y(v)];
      const run = runs.at(-1);
      if (run) run.push(p);
      else runs.push([p]);
    });
    return runs.filter(Boolean);
  };
  const behind = runsOf(other.slice(0, values.length))
    .map((pts) => (pts.length > 1 ? `<path class="spark-compare" d="${line(pts)}"/>` : `<circle class="spark-compare-dot" cx="${n(pts[0][0])}" cy="${n(pts[0][1])}" r="1.25"/>`))
    .join('');
  let marks = '';
  if (kind === 'bar') {
    // Thin bars when there are many, so they stay apart.
    const bw = Math.min(values.length > 8 ? 4 : 7, band * 0.8);
    marks = values
      .map((v, i) =>
        has(v) ? `<rect x="${n(l + band * i + (band - bw) / 2)}" y="${n(Math.min(y(v), base))}" width="${n(bw)}" height="${n(Math.abs(base - y(v)))}" rx="1"/>` : '',
      )
      .join('');
  } else {
    // One run per stretch without a gap; one value alone sits in the middle.
    const paths = runsOf(values);
    const fill = kind === 'area' ? paths.map((pts) => `<path class="spark-fill" d="${line(pts)}L${n(pts.at(-1)[0])} ${n(base)}L${n(pts[0][0])} ${n(base)}Z"/>`).join('') : '';
    const stroke = paths.map((pts) => (pts.length > 1 ? `<path class="spark-stroke" d="${line(pts)}"/>` : `<circle class="spark-dot" cx="${n(pts[0][0])}" cy="${n(pts[0][1])}" r="1.5"/>`)).join('');
    const end = last ? paths.at(-1).at(-1) : null;
    marks = fill + stroke + (end ? `<circle class="spark-dot spark-last" cx="${n(end[0])}" cy="${n(end[1])}" r="2.5"/>` : '');
  }
  const ref = has(reference) && reference <= hi && reference >= lo ? `<line class="spark-ref" x1="${l}" x2="${width - r}" y1="${n(y(reference))}" y2="${n(y(reference))}"/>` : '';
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<svg class="spark" data-kind="${kind}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${a11y}>${ref}${behind}${marks}</svg>`;
};
