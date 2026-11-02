// Synthetic data only, like everything in this repo.
import assert from 'node:assert/strict';
import { lines } from './lines.mjs';
import { renderPlot } from './plot.mjs';

const rows = [
  { week: 'W1', a: 2, b: 5 },
  { week: 'W2', a: 3, b: null },
  { week: 'W3', a: 4, b: 7 },
  { week: 'W4', a: 6, b: 8, b_open: 8 },
  { week: 'W5', a: 5, b_open: 9 },
];
const series = [
  { key: 'a', label: 'Alder', color: 'var(--c-chart-1)' },
  { key: 'b', label: 'Birch', color: 'var(--c-chart-2)' },
  { key: 'b_open', label: 'Birch, not settled', color: 'var(--c-chart-2)', dashed: true, silent: true, continues: 'b', endLabel: false },
];
const spec = { rows, x: 'week', series, unit: 'units', digits: 1, tick: (v, i) => (i % 2 ? '' : v) };

const options = lines(spec, 600);
const svg = renderPlot(options);
const ticks = [...svg.matchAll(/<text[^>]*>(W\d)<\/text>/g)].map((m) => m[1]);
assert.deepEqual(ticks, ['W1', 'W3', 'W5'], 'only the ticks the tick function prints');
assert.ok(/>Alder</.test(svg) && />Birch</.test(svg), 'subject lines end in their name');
assert.ok(!/Birch, not settled/.test(svg), 'a silent line has no name at its end');
assert.ok(svg.includes('stroke-dasharray="4 3"'), 'a dashed series is dashed');
assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'no hex: colours are tokens');

// A null breaks the line: Birch is drawn as two pieces, W1 alone and W3 to W4.
const birch = svg.match(/<g(?![^>]*dasharray)[^>]*stroke="var\(--c-chart-2\)" fill="none"><path d="([^"]+)"/)[1];
assert.equal((birch.match(/M/g) ?? []).length, 2, 'a null breaks the line instead of joining across it');

// The tooltip: every series with a value, and a silent one only where its line has none.
const tip = options.marks.at(-1);
const title = (i) => tip.channels.title.value(rows[i]);
assert.equal(title(0), 'W1\nAlder  2.0\nBirch  5.0\nunits');
assert.equal(title(1), 'W2\nAlder  3.0\nunits', 'a missing value is left out, not shown as 0');
assert.equal(title(3), 'W4\nAlder  6.0\nBirch  8.0\nunits', 'a silent series stays out where its line has a value');
assert.equal(title(4), 'W5\nAlder  5.0\nBirch, not settled  9.0\nunits', 'and shows where it does not');

const legend = renderPlot(lines({ ...spec, legend: true }, 600));
assert.ok(!/>Alder</.test(legend), 'with a legend the lines carry no names');

const floor = lines({ ...spec, y: [0, 'auto'] }, 600);
assert.equal(floor.y.domain[0], 0, 'a fixed end of the y domain is kept');

console.log('lines: all assertions pass');
