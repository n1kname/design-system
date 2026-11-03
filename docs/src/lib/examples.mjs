// Every example chart, rendered to an SVG string at build time from synthetic data.

import { Plot, categorical, chrome, diverging, grid as gridLines, renderResponsive, sequential } from '@n1kname/charts';
import { bars as barsHelper } from '@n1kname/charts/bars';
import { heatmap as heatmapHelper } from '@n1kname/charts/heatmap';
import { lines as linesHelper } from '@n1kname/charts/lines';
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

// The lines helper, on two made-up series that move together and one gap.
export const weeksWide = Array.from({ length: 26 }, (_, i) => ({
  week: `W${i + 1}`,
  outside: Math.round((8 + 7 * Math.sin((i - 6) / 4)) * 10) / 10,
  inside: i === 12 ? null : Math.round((19 + 2.5 * Math.sin((i - 8) / 4)) * 10) / 10,
}));
export const linesSpec = {
  rows: weeksWide,
  x: 'week',
  unit: '°C, weekly mean',
  digits: 1,
  dots: false,
  tick: (v, i, width) => (i % (width < 480 ? 8 : 4) ? '' : v),
  series: [
    { key: 'outside', label: 'Outside', color: 'var(--c-chart-2)' },
    { key: 'inside', label: 'Inside', color: 'var(--c-chart-1)' },
  ],
};
export const linesChart = renderResponsive((width) => linesHelper(linesSpec, width));

// The bars helper: three made-up parts stacked per month, the last two months not settled.
export const monthsWide = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => ({
  month,
  base: 40,
  heat: Math.max(0, Math.round(45 * Math.cos((i / 11) * 2 * Math.PI) + 30)),
  power: Math.round(25 - 18 * Math.sin((i / 11) * Math.PI)),
  kind: i === 10 ? 'estimate' : i === 11 ? 'projection' : undefined,
}));
export const barsSpec = {
  rows: monthsWide,
  x: 'month',
  unit: 'units per month',
  fade: (r) => ({ estimate: 0.5, projection: 0.22 })[r.kind] ?? 1,
  dashed: (r) => r.kind === 'projection',
  series: [
    { key: 'base', label: 'Base', color: 'var(--c-chart-2)' },
    { key: 'heat', label: 'Heat', color: 'var(--c-chart-1)' },
    { key: 'power', label: 'Power', color: 'var(--c-chart-3)' },
  ],
};
export const barsChart = renderResponsive((width) => barsHelper(barsSpec, width));

// Grouped: two made-up years side by side, the summer months set apart as not comparable.
export const pairedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month, i) => ({
  month,
  before: i < 5 ? Math.round(80 - 14 * i + 6 * Math.sin(i)) / 100 : null,
  after: i < 5 ? Math.round(72 - 13 * i + 5 * Math.cos(i)) / 100 : null,
}));
export const groupedSpec = {
  rows: pairedMonths,
  x: 'month',
  unit: 'units per step',
  digits: 2,
  yDigits: 2,
  grouped: true,
  height: 200,
  tick: (m) => m[0],
  shade: { from: 'Jun', to: 'Aug', text: 'not comparable' },
  series: [
    { key: 'before', label: 'Year one', color: 'var(--c-chart-2)', tag: 'one' },
    { key: 'after', label: 'Year two', color: 'var(--c-chart-1)', tag: 'two' },
  ],
};
export const groupedChart = renderResponsive((width) => barsHelper(groupedSpec, width));

// The heatmap helper: a made-up level for each evening hour over eight days, in four steps.
export const HEAT_HOURS = [18, 19, 20, 21, 22, 23];
export const heatDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon 2'];
export const heatCells = heatDays.flatMap((day, d) =>
  HEAT_HOURS.map((hour, h) => ({ day, hour, level: d === 5 && h === 2 ? null : Math.round(40 + 12 * h + 9 * Math.sin(d * 1.7) + (d % 3) * 6) })),
);
export const heatmapSpec = {
  cells: heatCells,
  x: 'hour',
  y: 'day',
  value: 'level',
  xDomain: HEAT_HOURS,
  yDomain: heatDays,
  steps: [60, 80, 100],
  colors: sequential.slice(1, 5),
  marginLeft: 48,
  title: (c) => `${c.day}, ${c.hour}:00\n${c.level} units`,
  xTick: (h, _i, width) => (width < 400 && h % 2 ? '' : `${h}:00`),
};
export const heatmapChart = renderResponsive((width) => heatmapHelper(heatmapSpec, width));
