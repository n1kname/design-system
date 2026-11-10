// A trace: one long signal sampled many times a second, such as an ECG, drawn on paper the way a
// recorder draws it. The recording is cut into strips of a few seconds, one under the other, so a
// 30-second recording stays readable at any width instead of squeezing into one flat line.
//
// The paper keeps the recorder's proportions: 0.2 seconds across is as wide as 0.5 millivolts is
// tall (25 mm/s and 10 mm/mV), so a beat has the shape a clinician expects. Its finest squares are
// left out when they would be closer than 6px.
//
// Every sample can't get a pixel: a 30-second ECG has over 15,000. Each column of the strip keeps
// its lowest and highest value, so the narrow spikes of a beat survive at any width. (Taking every
// nth sample, as dash's first version did, can drop a spike altogether.)
//
// Output is an SVG string with classes, not colours: ./trace.css colours the paper and the line
// from tokens. A string, so the same trace draws at build time and in the page. The line is tagged
// for ./enter.mjs, so it draws in from the start the first time it shows.
//
//     import { trace } from '@n1kname/charts/trace';
//     import '@n1kname/charts/trace.css';
//
//     box.innerHTML = trace(samples, { rate: 512, width: box.clientWidth });

const n = (v) => +v.toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The recorder's paper: the time each square stands for, finest first. Its height in millivolts is
// 2.5 times its width in seconds.
const SQUARES = [0.04, 0.2, 1, 5];
const MV_PER_S = 2.5;
// The shortest strip, in px per second, before strips get shorter: about 60px a second keeps a beat
// wider than it is tall.
const MIN_PX_PER_S = 60;
const STRIPS = [10, 5, 2.5];

/** How many seconds a strip holds at this width: 10, 5 or 2.5. */
export const stripSeconds = (width) => STRIPS.find((s) => width / s >= MIN_PX_PER_S) ?? STRIPS.at(-1);

// The lowest and highest value of each column, in sample order, so the path goes down and up
// through a spike instead of skipping it.
export const envelope = (values, columns) => {
  if (values.length <= columns * 2) return values.map((v, i) => [i, v]);
  const out = [];
  const per = values.length / columns;
  for (let c = 0; c < columns; c++) {
    const from = Math.floor(c * per);
    const to = Math.min(values.length, Math.floor((c + 1) * per));
    let lo = from;
    let hi = from;
    for (let i = from; i < to; i++) {
      if (values[i] < values[lo]) lo = i;
      if (values[i] > values[hi]) hi = i;
    }
    if (lo === hi) out.push([lo, values[lo]]);
    else if (lo < hi) out.push([lo, values[lo]], [hi, values[hi]]);
    else out.push([hi, values[hi]], [lo, values[lo]]);
  }
  return out;
};

// values: the samples, in order. rate: samples per second. perMv: how many of the values' unit make
// a millivolt (1000 for microvolts). width: in px. seconds: per strip, or chosen by width. gain: 2
// draws the signal twice as tall on the same paper, for a weak one. label: what a screen reader
// hears.
export const trace = (values, { rate, perMv = 1000, width = 800, seconds, gain = 1, label = 'The trace' } = {}) => {
  const samples = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!samples.length || !(rate > 0)) return '';
  const strip = seconds ?? stripSeconds(width);
  const duration = samples.length / rate;
  const rows = Math.max(1, Math.ceil(duration / strip - 1e-9));
  const [left, right, gap, labelRoom] = [0, 0, 10, 16];
  const inner = width - left - right;
  const pxPerS = inner / strip;
  const pxPerMv = (pxPerS / MV_PER_S) * gain;

  // The squares: the finest at least 6px apart, and every fifth one bold (the next size up).
  const minor = SQUARES.find((s) => s * pxPerS >= 6) ?? SQUARES.at(-1);
  const major = SQUARES[SQUARES.indexOf(minor) + 1] ?? minor * 5;

  // Every strip has the same height and the same zero, from the whole recording: at least 2 mV,
  // so a quiet trace doesn't fill the paper, and at most 6, so one artefact doesn't shrink the rest.
  const mv = samples.map((v) => v / perMv);
  const low = Math.max(-3, Math.min(-0.5, ...mv));
  const high = Math.min(3, Math.max(1, ...mv));
  const span = Math.max(2, high - low);
  const pad = 4;
  const band = span * pxPerMv + pad * 2;
  const rowHeight = labelRoom + band;
  const height = rows * rowHeight + (rows - 1) * gap;
  // The square size in px, for the grid's horizontal lines, which share the vertical ones' spacing.
  const minorPx = minor * pxPerS;
  const majorPx = major * pxPerS;

  const perStrip = Math.round(strip * rate);
  const parts = [];
  for (let r = 0; r < rows; r++) {
    const top = r * (rowHeight + gap);
    const paperTop = top + labelRoom;
    const zero = paperTop + pad + high * pxPerMv;
    const slice = samples.slice(r * perStrip, (r + 1) * perStrip);
    const stripWidth = (slice.length / rate) * pxPerS;
    // The paper runs the full width on every strip, so the last, shorter strip still reads as paper.
    let minorLines = '';
    let majorLines = '';
    for (let x = 0; x <= inner + 0.01; x += minorPx) {
      const at = n(left + x);
      const isMajor = Math.abs(x / majorPx - Math.round(x / majorPx)) < 1e-6;
      const line = `M${at} ${n(paperTop)}V${n(paperTop + band)}`;
      if (isMajor) majorLines += line;
      else minorLines += line;
    }
    // Horizontal lines step out from zero, so a bold line runs through 0 mV.
    const rule = (y, isMajor) => {
      const line = `M${left} ${n(y)}H${n(left + inner)}`;
      if (isMajor) majorLines += line;
      else minorLines += line;
    };
    for (let k = 0; zero - k * minorPx >= paperTop - 0.01; k++) rule(zero - k * minorPx, k % Math.round(majorPx / minorPx) === 0);
    for (let k = 1; zero + k * minorPx <= paperTop + band + 0.01; k++) rule(zero + k * minorPx, k % Math.round(majorPx / minorPx) === 0);

    const points = envelope(slice, Math.max(1, Math.round(stripWidth * 2)));
    const toX = (i) => left + (i / rate) * pxPerS;
    const toY = (v) => Math.min(paperTop + band, Math.max(paperTop, zero - (v / perMv) * pxPerMv));
    const d = points.map(([i, v], k) => `${k ? 'L' : 'M'}${n(toX(i))} ${n(toY(v))}`).join('');
    const from = r * strip;
    parts.push(
      `<g class="trace-strip">` +
        `<text class="trace-time" x="${left}" y="${n(top + 11)}">${from === 0 ? '0 s' : `${+from.toFixed(1)} s`}</text>` +
        `<path class="trace-minor" d="${minorLines}"/>` +
        `<path class="trace-major" d="${majorLines}"/>` +
        `<g class="enter-line"><path class="trace-line" d="${d}"/></g>` +
        `</g>`,
    );
  }

  return (
    `<svg class="trace" width="${width}" height="${n(height)}" viewBox="0 0 ${width} ${n(height)}" role="img" aria-label="${esc(label)}"` +
    ` data-strip="${strip}" data-rows="${rows}" data-minor="${minor}">${parts.join('')}</svg>`
  );
};

/** What a trace holds, in words: "15,360 samples at 512 Hz, 30.0 s". */
export const traceSummary = (count, rate, { locale } = {}) =>
  `${count.toLocaleString(locale)} samples at ${Math.round(rate)} Hz, ${(count / rate).toFixed(1)} s`;
