// Synthetic data only, like everything in this repo.
import assert from 'node:assert/strict';
import { heatmap, heatmapHeight } from './heatmap.mjs';
import { renderPlot } from './plot.mjs';
import { sequential } from './theme.mjs';

const HOURS = [20, 21, 22, 23];
const DAYS = ['D1', 'D2', 'D3'];
const cells = [
  { day: 'D1', hour: 20, level: 500 },
  { day: 'D1', hour: 21, level: 650 },
  { day: 'D2', hour: 22, level: 1300 },
  { day: 'D3', hour: 23, level: null },
];
const spec = {
  cells,
  x: 'hour',
  y: 'day',
  value: 'level',
  xDomain: HOURS,
  yDomain: DAYS,
  steps: [600, 1000],
  colors: sequential.slice(0, 3),
  title: (c) => `${c.day} ${c.hour}:00\n${c.level} units`,
  xTick: (h, _i, width) => (width < 300 && h % 2 ? '' : `${h}h`),
};

const options = heatmap(spec, 400);
const svg = renderPlot(options);
assert.ok(/class="enter-cell"/.test(svg), 'cells are tagged to arrive');
assert.equal(options.height, heatmapHeight(3), 'as tall as its rows');
assert.ok(heatmapHeight(6) > heatmapHeight(3), 'and taller with more rows');
assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'no hex: colours are tokens');

// Each cell takes the colour of the step its value falls in.
const fills = [...svg.matchAll(/<rect[^>]*fill="(var\(--c-seq-\d\))"/g)].map((m) => m[1]);
assert.deepEqual(fills, ['var(--c-seq-1)', 'var(--c-seq-2)', 'var(--c-seq-3)'], 'below, between and above the steps');
assert.equal((svg.match(/<rect/g) ?? []).length, 3, 'a cell with no value is left out');

// Labels: every hour on a wide chart, every other on a narrow one.
const labels = (s) => [...s.matchAll(/>(\d\dh)</g)].map((m) => m[1]);
assert.deepEqual(labels(svg), ['20h', '21h', '22h', '23h'], 'every x label when there is room');
assert.deepEqual(labels(renderPlot(heatmap(spec, 280))), ['20h', '22h'], 'fewer when narrow');

assert.equal(options.marks[0].channels.title.value(cells[1]), 'D1 21:00\n650 units', "the tooltip's own words");

// pointer: false leaves out Plot's tooltip, for a page that says what is under the pointer itself.
const own = heatmap({ ...spec, pointer: false }, 400);
assert.ok(options.marks[0].channels.title, 'a title by default');
assert.ok(!own.marks[0].channels.title, 'no title with pointer: false');

console.log('heatmap: all assertions pass');
