// Bars on one axis, one per row: a single value, or a few series stacked in the order given,
// bottom to top. Returns Plot options without a style, so the same chart draws at build time
// (renderPlot) or in the browser (Plot.plot with the page's style).
//
// Rows are wide: one object per x, a number (or null for none) per series key. Positive
// values stack up from zero and negative ones down, so a month that returned more than it
// bought still reads. A row can be drawn fainter (`fade`) and with a dashed edge (`dashed`),
// for figures that are not settled yet; say what each means in a Legend.

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
    // Words on the y axis, such as its unit, when the chart has no subtitle to say it.
    yLabel = null,
    marginLeft = 44,
    marginBottom = 30,
  },
  width,
) => {
  const has = (r, key) => typeof r[key] === 'number';
  // Where each series' piece of each bar starts and ends.
  const pieces = series.map(() => []);
  for (const r of rows) {
    let up = 0;
    let down = 0;
    series.forEach((s, i) => {
      if (!has(r, s.key)) return;
      const v = r[s.key];
      const from = v >= 0 ? up : down;
      if (v >= 0) up += v;
      else down += v;
      pieces[i].push({ row: r, y1: from, y2: from + v });
    });
  }
  const top = (r) => series.reduce((sum, s) => sum + (has(r, s.key) && r[s.key] > 0 ? r[s.key] : 0), 0);
  const bottom = (r) => series.reduce((sum, s) => sum + (has(r, s.key) && r[s.key] < 0 ? r[s.key] : 0), 0);
  const total = (r) => series.reduce((sum, s) => sum + (has(r, s.key) ? r[s.key] : 0), 0);
  const drawn = rows.filter((r) => series.some((s) => has(r, s.key)));
  const domain = [
    y[0] === 'auto' ? Math.min(0, ...drawn.map(bottom)) : y[0],
    y[1] === 'auto' ? Math.max(0, ...drawn.map(top)) : y[1],
  ];
  const says =
    title ??
    ((r) => [r[x], ...[...series].reverse().filter((s) => has(r, s.key)).map((s) => `${s.label}  ${format(r[s.key], digits)}`), unit].join('\n'));

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
      // The last series is the top of the bar: rounded there, square on the baseline.
      ...(i === series.length - 1 ? { ry1: 4 } : {}),
    });

  const labels = (v, i) => tick(v, i, width);
  return {
    width,
    height,
    marginTop: values ? 24 : 10,
    marginLeft,
    marginRight: 4,
    marginBottom,
    x: { type: 'band', domain: rows.map((r) => r[x]), padding, label: null, tickSize: 0, tickFormat: labels, axis: null },
    y: { domain, nice: true, label: yLabel, tickSize: 0, ticks: 5, tickFormat: (v) => format(v, 0) },
    opacity: { type: 'identity' },
    marks: [
      Plot.axisX({ tickSize: 0, tickFormat: labels, lineWidth: wrap(width) }),
      Plot.gridY({ stroke: chrome.grid, strokeOpacity: 1, ticks: 5 }),
      // The bar under the pointer, behind the bars.
      Plot.barY(drawn, Plot.pointerX({ x, y1: () => domain[0], y2: () => domain[1], fill: 'var(--c-surface-hover)', inset: -2 })),
      ...series.flatMap((s, i) => [
        piece(s, i, pieces[i].filter((p) => !dashed(p.row)), false),
        piece(s, i, pieces[i].filter((p) => dashed(p.row)), true),
      ]),
      ...(values
        ? [Plot.text(drawn, { x, y: total, text: (r) => format(total(r), digits), dy: -8, lineAnchor: 'bottom', fill: chrome.text, fontSize: 12 })]
        : []),
      Plot.ruleY([0], { stroke: chrome.axis }),
      Plot.tip(drawn, Plot.pointerX({ x, y: top, title: says, ...tipStyle })),
    ],
  };
};
