// Every example chart, rendered to an SVG string at build time from synthetic data.

import { Plot, categorical, chrome, diverging, grid as gridLines, renderResponsive, sequential } from '@n1kname/charts';
import { SERIES, STACK, deltas, grid, lines, shares, stack } from './data.mjs';

const seriesDomain = (names) => ({ domain: names, range: categorical.slice(0, names.length) });

export const lineChart = renderResponsive((_, narrow) => ({
  height: narrow ? 240 : 280, marginRight: 64,
  x: { label: 'Week', line: true, tickSize: 0, ticks: narrow ? 4 : undefined },
  y: { label: 'Index', grid: false, tickSize: 0 },
  color: seriesDomain(SERIES),
  marks: [
    gridLines('y'),
    Plot.ruleX([1], { stroke: chrome.axis }),
    Plot.lineY(lines, { x: 'week', y: 'y', stroke: 'series', strokeWidth: 2 }),
    Plot.dot(lines, Plot.selectLast({ x: 'week', y: 'y', z: 'series', fill: 'series', r: 4, stroke: 'var(--c-surface)', strokeWidth: 2 })),
    Plot.text(lines, Plot.selectLast({ x: 'week', y: 'y', z: 'series', text: 'series', dx: 10, textAnchor: 'start', fill: chrome.text })),
  ],
}));

export const stackChart = renderResponsive((_, narrow) => ({
  height: 250, marginLeft: 36, marginBottom: 48,
  x: { label: 'Share of total', labelOffset: 44, grid: false, tickSize: 0, percent: true, ticks: narrow ? 4 : undefined },
  y: { label: null, tickSize: 0 },
  color: seriesDomain(STACK),
  marks: [
    Plot.barX(stack, Plot.stackX({ offset: 'normalize', order: null, x: 'value', y: 'period', fill: 'series', stroke: 'var(--c-surface)', strokeWidth: 2 })),
    Plot.ruleX([0], { stroke: chrome.axis }),
  ],
}));

export const heatmap = renderResponsive((_, narrow) => ({
  height: 250, marginLeft: 44, marginBottom: 48,
  padding: 0.06,
  x: { label: 'Hour', labelOffset: 44, tickSize: 0, interval: 1, ticks: narrow ? [0, 12, 23] : [0, 6, 12, 18, 23] },
  y: { label: null, tickSize: 0, domain: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  color: { type: 'threshold', domain: [20, 35, 50, 65, 80, 95], range: sequential },
  marks: [Plot.cell(grid, { x: 'hour', y: 'day', fill: 'value' })],
}));

export const divergeChart = renderResponsive((_, narrow) => ({
  height: 250, marginBottom: 48,
  x: { label: 'Month', labelOffset: 44, tickSize: 0, interval: 1, ticks: narrow ? [1, 4, 7, 10] : [1, 3, 5, 7, 9, 11] },
  y: { label: 'Against the baseline', grid: false, tickSize: 0 },
  color: { type: 'threshold', domain: [-12, -6, -2, 2, 6, 12], range: diverging },
  marks: [
    gridLines('y'),
    Plot.barY(deltas, { x: 'month', y: 'delta', fill: 'delta', insetLeft: narrow ? 2 : 8, insetRight: narrow ? 2 : 8, rx: 2 }),
    Plot.ruleY([0], { stroke: chrome.axis }),
  ],
}));

export const emphasisData = shares.map((d, i) => ({
  ...d,
  valueLabel: `${d.value}%`,
  color: i < 2 ? categorical[0] : undefined,
  strong: i < 2,
}));

// Every slice has its own slot, so a slice can be matched to its label.
export const partsData = shares.slice(0, 5).map((d, i) => ({ ...d, valueLabel: `${d.value}%`, color: categorical[i] }));

export { SERIES, STACK, deltas, lines, categorical, sequential, diverging };
