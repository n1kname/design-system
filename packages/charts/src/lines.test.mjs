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
assert.ok(/class="enter-line"/.test(svg) && /class="enter-dot"/.test(svg), 'solid lines and dots are tagged to arrive');
assert.ok(/<g[^>]*class="enter-fade"[^>]*stroke-dasharray="4 3"|<g[^>]*stroke-dasharray="4 3"[^>]*class="enter-fade"/.test(svg), 'a dashed line fades in, its dash is its own');

// A null breaks the line: Birch is drawn as two pieces, W1 alone and W3 to W4.
const birch = svg.match(/<g(?![^>]*dasharray)[^>]*stroke="var\(--c-chart-2\)" fill="none"[^>]*><path d="([^"]+)"/)[1];
assert.equal((birch.match(/M/g) ?? []).length, 2, 'a null breaks the line instead of joining across it');

// The tooltip: every series with a value, and a silent one only where its line has none.
const tip = options.marks.at(-1);
const title = (i) => tip.channels.title.value(rows[i]);
assert.equal(title(0), 'W1\nAlder  2.0\nBirch  5.0\nunits');
assert.equal(title(1), 'W2\nAlder  3.0\nunits', 'a missing value is left out, not shown as 0');
assert.equal(title(3), 'W4\nAlder  6.0\nBirch  8.0\nunits', 'a silent series stays out where its line has a value');
assert.equal(title(4), 'W5\nAlder  5.0\nBirch, not settled  9.0\nunits', 'and shows where it does not');

// Lines listed newest first, each with its dashed rest: the unsettled value comes last.
const years = lines({ ...spec, series: [series[1], series[2], series[0]] }, 600).marks.at(-1);
assert.equal(years.channels.title.value(rows[4]), 'W5\nAlder  5.0\nBirch, not settled  9.0\nunits', 'an unsettled value after the settled ones');

const legend = renderPlot(lines({ ...spec, legend: true }, 600));
assert.ok(!/>Alder</.test(legend), 'with a legend the lines carry no names');

const floor = lines({ ...spec, y: [0, 'auto'] }, 600);
assert.equal(floor.y.domain[0], 0, 'a fixed end of the y domain is kept');

// Dates on a time scale, labelled where asked, one series with dots and the other without,
// a line at zero and the tooltip's own words.
const days = ['2024-01-01', '2024-01-08', '2024-01-22', '2024-01-29'].map((d, i) => ({ date: new Date(d), a: i < 2 ? i - 0.5 : null, b: i >= 1 ? i : null }));
const timed = lines(
  {
    rows: days,
    x: 'date',
    time: true,
    xTicks: () => [days[0].date, days[3].date],
    tick: (d) => d.toISOString().slice(5, 10),
    series: [
      { key: 'a', label: 'Ash', color: 'var(--c-chart-2)', dots: false },
      { key: 'b', label: 'Beech', color: 'var(--c-chart-1)' },
    ],
    unit: 'units',
    digits: 1,
    dots: true,
    zero: true,
    yLabel: 'units a week',
    title: (r) => `Week of ${r.date.toISOString().slice(0, 10)}`,
    legend: true,
  },
  600,
);
const timedSvg = renderPlot(timed);
assert.equal(timed.x.type, 'utc', 'dates go on a time scale');
assert.deepEqual([...timedSvg.matchAll(/>(\d\d-\d\d)</g)].map((m) => m[1]), ['01-01', '01-29'], 'labelled only at the dates asked for');
assert.equal((timedSvg.match(/<circle/g) ?? []).length, 3, 'dots only on the series that wants them');
assert.ok(/<g stroke="var\(--c-chart-axis\)"><line y2="([\d.]+)" y1="\1"/.test(timedSvg), 'a line at zero');
assert.ok(/units a week/.test(timedSvg), 'the y axis carries its words');
assert.equal(timed.marks.at(-1).channels.title.value(days[1]), 'Week of 2024-01-08', "the tooltip's own words");

assert.equal(lines({ ...spec, legend: true, marginRight: 24 }, 600).marginRight, 24, 'a page can give the last label room');

console.log('lines: all assertions pass');

// pointer: false leaves out Plot's tooltip, crosshair and dot, for a page that draws its own.
{
  const own = lines({ ...spec, pointer: false }, 600);
  const names = (o) => o.marks.flat().filter(Boolean).map((m) => m.constructor.name);
  assert.ok(names(options).includes('Tip'), "Plot's tip is there by default");
  assert.ok(!names(own).includes('Tip') && !names(own).includes('RuleX'), 'no tip or crosshair with pointer: false');
  assert.ok(!own.marks.flat().some((m) => m?.r === 4), 'no pointer dot with pointer: false');
}

// Bands: a range shaded behind the lines, in the domain, in the tooltip, with an end label.
{
  const rows = [
    { year: '2012', top: 100, lo: 100, hi: 100 },
    { year: '2013', top: 121, lo: 112, hi: 116 },
    { year: '2014', top: 146, lo: 125, hi: 135 },
  ];
  const o = lines({ rows, x: 'year', unit: 'index', series: [{ key: 'top', label: 'Top quartile', color: 'var(--c-chart-2)', endLabel: '21%' }], bands: [{ low: 'lo', high: 'hi', label: 'Benchmarks', endLabel: '12–16%' }] }, 500);
  const svg = renderPlot(o);
  assert.ok(o.marks.some((m) => m.constructor.name === 'Area'), 'the band is an area');
  assert.ok(svg.includes('>12–16%<'), 'the band ends in its label');
  assert.ok(o.y.domain[1] >= 146 && o.y.domain[0] <= 100, 'the domain takes in the band and the lines');
  const tip = o.marks.at(-1);
  assert.equal(tip.channels.title.value(rows[1]), '2013\nTop quartile  121\nBenchmarks  112–116\nindex', 'the tooltip gives the band as a range');
  console.log('lines: bands pass');
}

// References: a dashed level behind the lines, with its label, in the domain unless told not.
{
  const days = ['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06'].map((d, i) => ({ date: new Date(d), low: [24.99, 24.99, null, 22.49][i] }));
  const spec = { rows: days, x: 'date', time: true, unit: 'euro', digits: 2, series: [{ key: 'low', label: 'Lowest', color: 'var(--c-chart-1)' }], legend: true, dots: false };
  const o = lines({ ...spec, references: [{ y: 18, label: 'Target €18,00', tone: 'good' }], curve: 'step-after' }, 500);
  const svg = renderPlot(o);
  assert.ok(o.y.domain[0] <= 18, 'the scale stretches to take the reference in');
  assert.ok(svg.includes('>Target €18,00<'), 'the reference carries its label');
  assert.ok(/stroke="var\(--c-status-good\)"[^>]*stroke-dasharray="4 3"|stroke-dasharray="4 3"[^>]*stroke="var\(--c-status-good\)"/.test(svg), 'a good reference is a dashed rule in the status green');
  assert.ok(svg.indexOf('stroke-dasharray="4 3"') < svg.indexOf('stroke="var(--c-chart-1)" fill="none"'), 'drawn behind the lines');
  const path = svg.match(/<g[^>]*stroke="var\(--c-chart-1\)" fill="none"[^>]*><path d="([^"]+)"/)[1];
  const runs = path.split('M').filter(Boolean).map((run) => run.replace(/Z$/, '').split('L').map((pt) => pt.split(',').map(Number)));
  assert.ok(runs.every((pts) => pts.every((p, i) => i === 0 || p[0] === pts[i - 1][0] || p[1] === pts[i - 1][1])), 'a step-after curve draws flat runs and drops, no slopes');
  assert.equal(runs.length, 2, 'a null still breaks a stepped line');
  assert.equal((svg.match(/<circle/g) ?? []).length, 1, 'a value alone between gaps gets a dot, with dots off');

  const kept = lines({ ...spec, references: [{ y: 18, label: 'Target €18,00', stretch: false }] }, 500);
  const keptSvg = renderPlot(kept);
  assert.ok(kept.y.domain[0] > 18, 'with stretch: false the scale stays on the lines');
  assert.ok(keptSvg.includes('>Target €18,00, below the chart<'), 'and the label says where the target is');
  assert.ok(!keptSvg.includes('stroke-dasharray'), 'with no rule drawn outside the chart');

  const inside = renderPlot(lines({ ...spec, references: [{ y: 23.5, label: 'Target', stretch: false }] }, 500));
  assert.ok(inside.includes('stroke-dasharray="4 3"') && inside.includes('>Target<'), 'a reference inside the range is drawn either way');
  assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'no hex: colours are tokens');
  console.log('lines: references and curves pass');
}
