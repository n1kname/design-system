// Lines on one axis, for a few series in the same unit. Returns Plot options without a
// style, so the same chart draws at build time (renderPlot) or in the browser (Plot.plot
// with the page's style). Each subject line ends in its name; with `legend`, for lines that
// end together, they don't, and a Legend above the chart names them instead.
//
// Rows are wide: one object per x, a number (or null for no value) per series key. A null
// breaks the line rather than joining across it. With `time`, x is a Date per row and the
// steps need not be even, such as weeks with one missing.

import * as Plot from '@observablehq/plot';
import { chrome, tipStyle } from './theme.mjs';

const plain = (v, digits) => v.toFixed(digits);

export const lines = (
  {
    rows,
    x,
    series,
    unit,
    digits = 0,
    format = plain,
    height = 250,
    // Which x labels to print; the rest stay positions on the scale. Gets (label, index, width).
    tick = (label) => label,
    // Each end 'auto' or a number.
    y = ['auto', 'auto'],
    // A mark on every point. Leave off for long, dense series.
    dots = true,
    legend = false,
    // x as dates on a time scale, labelled at the dates `xTicks` gives for a width.
    time = false,
    xTicks,
    // A line at zero, for values that can fall below it.
    zero = false,
    // Plot's own tooltip, crosshair and dot. Leave on for a chart drawn at build time; turn off
    // when the page says what is under the pointer itself, with `pointer` from ./pointer.mjs.
    pointer = true,
    // Words on the y axis, such as its unit, and the decimals its labels show.
    yLabel = null,
    yDigits = 0,
    // The tooltip's text per row. By default the label, each series with a value, and the unit.
    title: says,
    marginLeft = 44,
    marginTop = 10,
    // Room on the right: by default for the end labels, or a little for the last x label with a legend.
    marginRight = legend ? 8 : 58,
  },
  width,
) => {
  const has = (r, key) => typeof r[key] === 'number';
  const values = rows.flatMap((r) => series.filter((s) => has(r, s.key)).map((s) => r[s.key]));
  const domain = [y[0] === 'auto' ? Math.min(...values) : y[0], y[1] === 'auto' ? Math.max(...values) : y[1]];

  // The tooltip names every series with a value at that x. A silent one, such as the
  // dashed rest of another line, only where the line it `continues` has none, and after
  // the settled ones.
  const told = (r) => [
    ...series.filter((s) => !s.silent && has(r, s.key)),
    ...series.filter((s) => s.silent && s.continues && has(r, s.key) && !has(r, s.continues)),
  ];
  const tipped = rows.filter((r) => told(r).length);
  const title = says ?? ((r) => [r[x], ...told(r).map((s) => `${s.label}  ${format(r[s.key], digits)}`), unit].join('\n'));

  const named = series
    .map((s) => ({ s, name: s.endLabel ?? (s.silent ? false : s.label) }))
    .filter(({ name }) => !legend && name !== false);

  return {
    width,
    height,
    marginTop,
    marginLeft,
    marginRight,
    marginBottom: 30,
    x: time
      ? { type: 'utc', label: null, tickSize: 0, ticks: xTicks?.(width), tickFormat: (v, i) => tick(v, i, width) }
      : { type: 'point', domain: rows.map((r) => r[x]), label: null, tickSize: 0, tickFormat: (v, i) => tick(v, i, width) },
    y: { domain, nice: true, label: yLabel, tickSize: 0, ticks: 5, tickFormat: (v) => format(v, yDigits) },
    marks: [
      Plot.gridY({ stroke: chrome.grid, strokeOpacity: 1, ticks: 5 }),
      ...(zero ? [Plot.ruleY([0], { stroke: chrome.axis })] : []),
      ...series.map((s) =>
        Plot.line(rows, {
          x,
          y: (r) => (has(r, s.key) ? r[s.key] : NaN),
          stroke: s.color,
          strokeWidth: s.width ?? 2,
          strokeDasharray: s.dashed ? '4 3' : undefined,
          // A dashed line can't draw itself in with a dash of its own, so it fades.
          className: s.dashed ? 'enter-fade' : 'enter-line',
        }),
      ),
      // A series' own `dots` wins over the chart's.
      ...series
        .filter((s) => s.dots ?? dots)
        .map((s) =>
          Plot.dot(rows.filter((r) => has(r, s.key)), {
            x,
            y: s.key,
            r: 2.5,
            fill: s.dashed ? 'var(--c-surface)' : s.color,
            stroke: s.color,
            strokeWidth: s.dashed ? 1.5 : 0,
            className: 'enter-dot',
          }),
        ),
      ...named.map(({ s, name }) => {
        const last = rows.findLast((r) => has(r, s.key));
        return Plot.text(last ? [last] : [], {
          x,
          y: s.key,
          text: () => name,
          dx: 7,
          textAnchor: 'start',
          fill: chrome.text,
          fontWeight: 600,
          fontSize: 11,
          className: 'enter-fade',
        });
      }),
      ...(pointer
        ? [
            Plot.ruleX(tipped, Plot.pointerX({ x, stroke: chrome.axis })),
            ...series
              .filter((s) => !s.silent)
              .map((s) =>
                Plot.dot(rows.filter((r) => has(r, s.key)), Plot.pointerX({ x, y: s.key, r: 4, fill: s.color, stroke: 'var(--c-surface)', strokeWidth: 2 })),
              ),
            Plot.tip(tipped, Plot.pointerX({ x, y: (r) => Math.max(...told(r).map((s) => r[s.key])), title, ...tipStyle })),
          ]
        : []),
    ],
  };
};
