// Bars on one axis, one per row: a single value, a few series stacked in the order given,
// bottom to top, or with `grouped` side by side, such as last year beside this one. Returns Plot options without a style, so the same chart draws at build time
// (renderPlot) or in the browser (Plot.plot with the page's style).
//
// Rows are wide: one object per x, a number (or null for none) per series key. Positive
// values stack up from zero and negative ones down, so a month that returned more than it
// bought still reads. A row can be drawn fainter (`fade`) and with a dashed edge (`dashed`),
// for figures that are not settled yet; say what each means in a Legend. A run of steps can be
// set apart as one shaded block with a word on why (`shade`), and a series can carry a short
// `tag` over its first bar, so two series are not told apart by colour alone.

import * as Plot from '@observablehq/plot';
import { chrome, tipStyle } from './theme.mjs';

const plain = (v, digits) => v.toFixed(digits);

export const bars = (
  {
    rows,
    x,
    series,
    unit,
    digits = 0,
    format = plain,
    height = 240,
    // Which x labels to print; the rest stay positions on the scale. Gets (label, index, width).
    tick = (label) => label,
    // Each end 'auto' or a number. 'auto' always takes in zero, so bars stand on it.
    y = ['auto', 'auto'],
    // The total written on top of each bar.
    values = false,
    // Opacity per row, 1 for a settled figure.
    fade = () => 1,
    // A dashed edge per row, in the series' colour.
    dashed = () => false,
    // The tooltip's text per row. By default the label, each series from the top, and the unit.
    title,
    // The gap between bars, as a share of each bar's room.
    padding = 0.28,
    // How many ems an x label may run before it wraps onto another line, for long labels on
    // a narrow chart. Gets the width.
    wrap = () => Infinity,
    // Words on the y axis, such as its unit, when the chart has no subtitle to say it, and the
    // decimals its labels show.
    yLabel = null,
    yDigits = 0,
    marginLeft = 44,
    marginBottom = 30,
    // The series side by side in each step, each bar from zero, instead of stacked.
    grouped = false,
    // A run of steps set apart: { from, to, text }, the first and last x and why.
    shade = null,
  },
  width,
) => {
  const marginRight = 4;
  const has = (r, key) => typeof r[key] === 'number';
  // Where each series' piece of each bar starts and ends.
  const pieces = series.map(() => []);
  for (const r of rows) {
    let up = 0;
    let down = 0;
    series.forEach((s, i) => {
      if (!has(r, s.key)) return;
      const v = r[s.key];
      const from = grouped ? 0 : v >= 0 ? up : down;
      if (v >= 0) up += v;
      else down += v;
      pieces[i].push({ row: r, y1: from, y2: from + v });
    });
  }
  const valuesOf = (r) => series.filter((s) => has(r, s.key)).map((s) => r[s.key]);
  const sum = (vs) => vs.reduce((a, b) => a + b, 0);
  const top = (r) => (grouped ? Math.max(0, ...valuesOf(r)) : sum(valuesOf(r).filter((v) => v > 0)));
  const bottom = (r) => (grouped ? Math.min(0, ...valuesOf(r)) : sum(valuesOf(r).filter((v) => v < 0)));
  const total = (r) => series.reduce((sum, s) => sum + (has(r, s.key) ? r[s.key] : 0), 0);
  const drawn = rows.filter((r) => series.some((s) => has(r, s.key)));
  const domain = [
    y[0] === 'auto' ? Math.min(0, ...drawn.map(bottom)) : y[0],
    y[1] === 'auto' ? Math.max(0, ...drawn.map(top)) : y[1],
  ];
  // Stacked, the tooltip lists the parts from the top, as they are drawn; grouped, in order.
  const listed = grouped ? series : [...series].reverse();
  const says = title ?? ((r) => [r[x], ...listed.filter((s) => has(r, s.key)).map((s) => `${s.label}  ${format(r[s.key], digits)}`), unit].join('\n'));
  // Grouped, every step has a tooltip, even one with no bars, so a step left out can say why.
  const tipped = grouped ? rows : drawn;

  // Where the bars sit in a step. Plot's band scale puts `padding` of a step on each side of
  // the bands, so a step is the range over the number of rows plus that padding. Grouped, the
  // scale is not rounded to whole pixels, so the bars land where this says.
  const step = (width - marginLeft - marginRight) / (rows.length + padding);
  const band = step * (1 - padding);
  const GAP = 2;
  const barWidth = Math.min(14, (band - GAP * (series.length - 1)) / series.length);
  const group = barWidth * series.length + GAP * (series.length - 1);
  // Each series' bar, from the left of its band.
  const left = (i) => (band - group) / 2 + i * (barWidth + GAP);
  const inset = (i) => (grouped ? { insetLeft: left(i), insetRight: band - left(i) - barWidth } : {});

  // Settled rows and dashed ones are separate marks, because a dash cannot vary per bar.
  const piece = (s, i, rowsOf, edge) =>
    Plot.barY(rowsOf, {
      x: (p) => p.row[x],
      y1: 'y1',
      y2: 'y2',
      fill: s.color,
      fillOpacity: (p) => fade(p.row),
      stroke: edge ? s.color : 'var(--c-surface)',
      strokeWidth: 1,
      strokeDasharray: edge ? '3 2' : undefined,
      className: 'enter-bar',
      // The last series is the top of the bar: rounded there, square on the baseline. Grouped,
      // every bar is its own top.
      ...(grouped || i === series.length - 1 ? { ry1: 4 } : {}),
      ...inset(i),
    });

  // The shaded run, edge to edge across its steps, with its word in the middle.
  const shaded = shade ? rows.slice(rows.findIndex((r) => r[x] === shade.from), rows.findIndex((r) => r[x] === shade.to) + 1) : [];
  const shading = shaded.length
    ? [
        Plot.barY(shaded, { x, y1: () => domain[0], y2: () => domain[1], fill: chrome.neutral, fillOpacity: 0.16, inset: -(step - band) / 2, className: 'enter-fade' }),
        Plot.text([shaded[0]], {
          x,
          frameAnchor: 'middle',
          dx: ((shaded.length - 1) * step) / 2,
          text: () => shade.text,
          fill: 'var(--c-text-secondary)',
          fontSize: 11,
          className: 'enter-fade',
        }),
      ]
    : [];

  // A series' tag over its first bar. The first grows leftward from its bar's right edge and
  // the rest rightward from their left edge, so two tags never touch.
  const tags = series.flatMap((s, i) => {
    const first = rows.find((r) => has(r, s.key));
    if (!s.tag || !first) return [];
    const edge = grouped ? (i === 0 ? left(i) + barWidth : left(i)) - band / 2 : 0;
    return [
      Plot.text([first], {
        x,
        y: (r) => (grouped ? Math.max(0, r[s.key]) : top(r)),
        text: () => s.tag,
        dx: edge,
        dy: -6,
        lineAnchor: 'bottom',
        textAnchor: grouped && i === 0 ? 'end' : 'start',
        fill: 'var(--c-text-secondary)',
        fontSize: 10,
        className: 'enter-fade',
      }),
    ];
  });

  const labels = (v, i) => tick(v, i, width);
  return {
    width,
    height,
    marginTop: values || series.some((s) => s.tag) ? 24 : 10,
    marginLeft,
    marginRight,
    marginBottom,
    x: { type: 'band', domain: rows.map((r) => r[x]), padding, ...(grouped ? { round: false } : {}), label: null, tickSize: 0, tickFormat: labels, axis: null },
    y: { domain, nice: true, label: yLabel, tickSize: 0, ticks: 5, tickFormat: (v) => format(v, yDigits) },
    opacity: { type: 'identity' },
    marks: [
      Plot.axisX({ tickSize: 0, tickFormat: labels, lineWidth: wrap(width) }),
      ...shading,
      Plot.gridY({ stroke: chrome.grid, strokeOpacity: 1, ticks: 5 }),
      // The bar under the pointer, behind the bars.
      Plot.barY(tipped, Plot.pointerX({ x, y1: () => domain[0], y2: () => domain[1], fill: 'var(--c-surface-hover)', inset: -2 })),
      ...series.flatMap((s, i) => [
        piece(s, i, pieces[i].filter((p) => !dashed(p.row)), false),
        piece(s, i, pieces[i].filter((p) => dashed(p.row)), true),
      ]),
      ...(values
        ? [Plot.text(drawn, { x, y: total, text: (r) => format(total(r), digits), dy: -8, lineAnchor: 'bottom', fill: chrome.text, fontSize: 12, className: 'enter-fade' })]
        : []),
      ...tags,
      Plot.ruleY([0], { stroke: chrome.axis, className: 'enter-zero' }),
      Plot.tip(tipped, Plot.pointerX({ x, y: top, title: says, ...tipStyle })),
    ],
  };
};
