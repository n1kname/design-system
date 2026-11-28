// Lines on one axis, for a few series in the same unit. Returns Plot options without a
// style, so the same chart draws at build time (renderPlot) or in the browser (Plot.plot
// with the page's style). Each subject line ends in its name; with `legend`, for lines that
// end together, they don't, and a Legend above the chart names them instead.
//
// Rows are wide: one object per x, a number (or null for no value) per series key. A null
// breaks the line rather than joining across it. With `time`, x is a Date per row and the
// steps need not be even, such as weeks with one missing.
//
// A band shades the range between two keys, such as a benchmark envelope from its lowest to its
// highest value, behind the lines, and ends in its own label.
//
// A reference is a level to read the lines against, such as a target price: a dashed rule behind
// the lines, its label at the left end, in muted text over a halo of the surface. The scale
// stretches to take it in, so the gap between the lines and the target shows. With
// `stretch: false` a reference outside the lines' range isn't drawn; its label sits at the chart's
// edge and says the target is below (or above) the chart instead.
//
// `curve` is Plot's: 'step-after' for a value that changes in steps, such as a price, where a
// slope between two days would show a change that never happened. Per series or for the chart.

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
    // Ranges shaded behind the lines: { low, high, label, color }, two keys per row.
    bands = [],
    // Levels to read the lines against: { y, label, tone?: 'neutral' | 'good', stretch? }.
    references = [],
    // Plot's curve for every line and band, such as 'step-after'; a series' own `curve` wins.
    curve,
  },
  width,
) => {
  const has = (r, key) => typeof r[key] === 'number';
  const keys = [...series.map((s) => s.key), ...bands.flatMap((b) => [b.low, b.high])];
  const values = rows.flatMap((r) => keys.filter((k) => has(r, k)).map((k) => r[k]));
  const reached = [...values, ...references.filter((ref) => ref.stretch !== false).map((ref) => ref.y)];
  const domain = [y[0] === 'auto' ? Math.min(...reached) : y[0], y[1] === 'auto' ? Math.max(...reached) : y[1]];
  // A reference left out of the domain and outside it is only said, at the edge it lies beyond.
  const beyond = (ref) => (ref.y < domain[0] ? 'below' : ref.y > domain[1] ? 'above' : null);
  const refColor = (ref) => (ref.tone === 'good' ? 'var(--c-status-good)' : chrome.textMuted);
  const halo = { stroke: 'var(--c-surface)', strokeWidth: 4, paintOrder: 'stroke', strokeLinejoin: 'round' };

  // The tooltip names every series with a value at that x. A silent one, such as the
  // dashed rest of another line, only where the line it `continues` has none, and after
  // the settled ones.
  const told = (r) => [
    ...series.filter((s) => !s.silent && has(r, s.key)),
    ...series.filter((s) => s.silent && s.continues && has(r, s.key) && !has(r, s.continues)),
  ];
  const tipped = rows.filter((r) => told(r).length);
  const ranged = (r) => bands.filter((b) => has(r, b.low) && has(r, b.high)).map((b) => `${b.label}  ${format(r[b.low], digits)}–${format(r[b.high], digits)}`);
  const title = says ?? ((r) => [r[x], ...told(r).map((s) => `${s.label}  ${format(r[s.key], digits)}`), ...ranged(r), unit].join('\n'));

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
      ...references.flatMap((ref) => {
        const side = beyond(ref);
        if (side) {
          return ref.label
            ? [Plot.text([ref], { frameAnchor: side === 'below' ? 'bottom-left' : 'top-left', text: () => `${ref.label}, ${side} the chart`, dx: 4, dy: side === 'below' ? -4 : 4, textAnchor: 'start', fill: chrome.textMuted, fontSize: 11, ...halo, className: 'enter-fade' })]
            : [];
        }
        return [
          Plot.ruleY([ref.y], { stroke: refColor(ref), strokeWidth: 1.5, strokeDasharray: '4 3', className: 'enter-fade' }),
          ...(ref.label ? [Plot.text([ref], { y: 'y', frameAnchor: 'left', text: 'label', dx: 4, dy: -7, textAnchor: 'start', fill: chrome.textMuted, fontSize: 11, ...halo, className: 'enter-fade' })] : []),
        ];
      }),
      ...bands.flatMap((b) => {
        const inside = rows.filter((r) => has(r, b.low) && has(r, b.high));
        const last = inside.at(-1);
        return [
          Plot.areaY(inside, { x, y1: b.low, y2: b.high, curve: b.curve ?? curve, fill: b.color ?? chrome.neutral, fillOpacity: b.opacity ?? 0.38, className: 'enter-fade' }),
          ...(legend || !b.label
            ? []
            : [
                Plot.text(last ? [last] : [], {
                  x,
                  y: (r) => (r[b.low] + r[b.high]) / 2,
                  text: () => b.endLabel ?? b.label,
                  dx: 7,
                  textAnchor: 'start',
                  fill: chrome.textMuted,
                  fontSize: 11,
                  className: 'enter-fade',
                }),
              ]),
        ];
      }),
      ...series.map((s) =>
        Plot.line(rows, {
          x,
          y: (r) => (has(r, s.key) ? r[s.key] : NaN),
          curve: s.curve ?? curve,
          stroke: s.color,
          strokeWidth: s.width ?? 2,
          strokeDasharray: s.dashed ? '4 3' : undefined,
          // A dashed line can't draw itself in with a dash of its own, so it fades.
          className: s.dashed ? 'enter-fade' : 'enter-line',
        }),
      ),
      // A value alone between two gaps would draw no line at all: it gets a dot, dots or not.
      ...series
        .filter((s) => !(s.dots ?? dots))
        .map((s) => {
          const alone = rows.filter((r, i) => has(r, s.key) && !(i > 0 && has(rows[i - 1], s.key)) && !(i < rows.length - 1 && has(rows[i + 1], s.key)));
          return Plot.dot(alone, { x, y: s.key, r: 2.5, fill: s.color, className: 'enter-dot' });
        }),
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
