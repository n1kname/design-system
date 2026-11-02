// Synthetic data only, like everything in this repo.
import assert from 'node:assert/strict';
import { bars } from './bars.mjs';
import { renderPlot } from './plot.mjs';

const rows = [
  { month: 'M1', a: 10, b: 4, c: 2 },
  { month: 'M2', a: 10, b: 6, c: -3 },
  { month: 'M3', a: 10, b: null, c: 1 },
  { month: 'M4', a: 10, b: 8, c: 5, kind: 'estimate' },
  { month: 'M5', a: 10, b: 9, c: 6, kind: 'projection' },
];
const series = [
  { key: 'a', label: 'Ash', color: 'var(--c-chart-2)' },
  { key: 'b', label: 'Beech', color: 'var(--c-chart-1)' },
  { key: 'c', label: 'Cedar', color: 'var(--c-chart-3)' },
];
const FADE = { estimate: 0.5, projection: 0.22 };
const spec = {
  rows,
  x: 'month',
  series,
  unit: 'units',
  digits: 1,
  tick: (v, i) => (i % 2 ? '' : v),
  fade: (r) => FADE[r.kind] ?? 1,
  dashed: (r) => r.kind === 'projection',
};

const options = bars(spec, 600);
const svg = renderPlot(options);
const ticks = [...svg.matchAll(/<text[^>]*>(M\d)<\/text>/g)].map((m) => m[1]);
assert.deepEqual(ticks, ['M1', 'M3', 'M5'], 'only the ticks the tick function prints');
assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'no hex: colours are tokens');

// The pieces of a bar: each series from where the one below it stopped.
const [, ashSolid, , beechSolid, , cedarSolid, cedarDashed] = options.marks.slice(1);
const span = (mark, i) => [mark.data[i].y1, mark.data[i].y2];
assert.deepEqual(span(beechSolid, 0), [10, 14], 'a series stacks on the one before it');
assert.deepEqual(span(cedarSolid, 0), [14, 16], 'and the last on top');
assert.deepEqual(span(cedarSolid, 1), [0, -3], 'a negative value hangs below zero instead');
assert.deepEqual(span(cedarSolid, 2), [10, 11], 'a missing value is left out, not drawn as 0');
assert.ok(!beechSolid.data.some((p) => p.row.month === 'M3'), 'and has no piece of its own');
assert.equal(ashSolid.data.length, 4, 'settled and estimated rows are drawn solid');
assert.equal(cedarDashed.data.length, 1, 'a dashed row is drawn apart, with its dashes');
assert.ok(svg.includes('stroke-dasharray="3 2"'), 'a dashed row is dashed');

// Fades: an estimate fainter, a projection fainter again.
const opacity = [...svg.matchAll(/fill="var\(--c-chart-2\)"[^>]*>((?:<(?:path|rect)[^>]*>)+)/g)]
  .flatMap((m) => [...m[1].matchAll(/fill-opacity="([\d.]+)"/g)].map((o) => Number(o[1])));
assert.deepEqual(opacity, [1, 1, 1, 0.5, 0.22], 'settled rows are solid, an estimate fainter, a projection fainter again');

// The domain holds the highest stack and the lowest negative.
assert.deepEqual(options.y.domain, [-3, 25], 'the y domain runs from the lowest piece to the highest stack');

// The tooltip: each series from the top, a missing one left out.
const tip = options.marks.at(-1);
const title = (i) => tip.channels.title.value(rows[i]);
assert.equal(title(0), 'M1\nCedar  2.0\nBeech  4.0\nAsh  10.0\nunits');
assert.equal(title(2), 'M3\nCedar  1.0\nAsh  10.0\nunits', 'a missing value is left out, not shown as 0');

// One series with its value on top of each bar.
const single = bars({ rows: rows.map((r) => ({ year: r.month, v: r.a + r.month.length })), x: 'year', series: [{ key: 'v', label: 'Value', color: 'var(--c-chart-1)' }], unit: 'units', values: true }, 400);
const labels = [...renderPlot(single).matchAll(/<text[^>]*>(\d+)<\/text>/g)].map((m) => m[1]);
assert.deepEqual(labels.slice(-5), ['12', '12', '12', '12', '12'], 'with values, each bar carries its total');

console.log('bars: all assertions pass');
