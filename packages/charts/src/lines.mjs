// Lines on one axis, for a few series in the same unit. Returns Plot options without a
// style, so the same chart draws at build time (renderPlot) or in the browser (Plot.plot
// with the page's style). Each subject line ends in its name; with `legend`, for lines that
// end together, they don't, and a Legend above the chart names them instead.
//
// Rows are wide: one object per x, a number (or null for no value) per series key. A null
// breaks the line rather than joining across it.

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
  },
  width,
) => {
  const has = (r, key) => typeof r[key] === 'number';
  const values = rows.flatMap((r) => series.filter((s) => has(r, s.key)).map((s) => r[s.key]));
  const domain = [y[0] === 'auto' ? Math.min(...values) : y[0], y[1] === 'auto' ? Math.max(...values) : y[1]];

  // The tooltip names every series with a value at that x. A silent one, such as the
  // dashed rest of another line, only where the line it `continues` has none.
  const told = (r) =>
    series.filter((s) => has(r, s.key) && (!s.silent || (s.continues && !has(r, s.continues))));
  const tipped = rows.filter((r) => told(r).length);
  const title = (r) => [r[x], ...told(r).map((s) => `${s.label}  ${format(r[s.key], digits)}`), unit].join('\n');

  const named = series
    .map((s) => ({ s, name: s.endLabel ?? (s.silent ? false : s.label) }))
    .filter(({ name }) => !legend && name !== false);

  return {
    width,
    height,
    marginTop: 10,
    marginLeft: 44,
    marginRight: legend ? 8 : 58,
    marginBottom: 30,
    x: { type: 'point', domain: rows.map((r) => r[x]), label: null, tickSize: 0, tickFormat: (v, i) => tick(v, i, width) },
    y: { domain, nice: true, label: null, tickSize: 0, ticks: 5, tickFormat: (v) => format(v, 0) },
    marks: [
      Plot.gridY({ stroke: chrome.grid, strokeOpacity: 1, ticks: 5 }),
      ...series.map((s) =>
        Plot.line(rows, {
          x,
          y: (r) => (has(r, s.key) ? r[s.key] : NaN),
          stroke: s.color,
          strokeWidth: s.width ?? 2,
          strokeDasharray: s.dashed ? '4 3' : undefined,
        }),
      ),
      ...(dots
        ? series.map((s) =>
            Plot.dot(rows.filter((r) => has(r, s.key)), {
              x,
              y: s.key,
              r: 2.5,
              fill: s.dashed ? 'var(--c-surface)' : s.color,
              stroke: s.color,
              strokeWidth: s.dashed ? 1.5 : 0,
            }),
          )
        : []),
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
        });
      }),
      Plot.ruleX(tipped, Plot.pointerX({ x, stroke: chrome.axis })),
      ...series
        .filter((s) => !s.silent)
        .map((s) =>
          Plot.dot(rows.filter((r) => has(r, s.key)), Plot.pointerX({ x, y: s.key, r: 4, fill: s.color, stroke: 'var(--c-surface)', strokeWidth: 2 })),
        ),
      Plot.tip(tipped, Plot.pointerX({ x, y: (r) => Math.max(...told(r).map((s) => r[s.key])), title, ...tipStyle })),
    ],
  };
};
