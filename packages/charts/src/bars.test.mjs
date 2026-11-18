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
assert.ok(/class="enter-bar"/.test(svg) && /class="enter-zero"/.test(svg), 'bars and the zero line are tagged to arrive');
const ticks = [...svg.matchAll(/<text[^>]*>(M\d)<\/text>/g)].map((m) => m[1]);
assert.deepEqual(ticks, ['M1', 'M3', 'M5'], 'only the ticks the tick function prints');
assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'no hex: colours are tokens');

// The pieces of a bar: each series from where the one below it stopped.
// After the x axis, the grid and the pointer's highlight: each series, settled then dashed.
const [ashSolid, , beechSolid, , cedarSolid, cedarDashed] = options.marks.slice(3);
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

// The domain holds the highest stack and the lowest negative, rounded out the way Plot would.
assert.deepEqual(options.y.domain, [-4, 26], 'the y domain runs from the lowest piece to the highest stack, rounded out');

// The tooltip: each series from the top, a missing one left out.
const tip = options.marks.at(-1);
const title = (i) => tip.channels.title.value(rows[i]);
assert.equal(title(0), 'M1\nCedar  2.0\nBeech  4.0\nAsh  10.0\nunits');
assert.equal(title(2), 'M3\nCedar  1.0\nAsh  10.0\nunits', 'a missing value is left out, not shown as 0');

// One series with its value on top of each bar.
const single = bars({ rows: rows.map((r) => ({ year: r.month, v: r.a + r.month.length })), x: 'year', series: [{ key: 'v', label: 'Value', color: 'var(--c-chart-1)' }], unit: 'units', values: true }, 400);
const labels = [...renderPlot(single).matchAll(/<text[^>]*>(\d+)<\/text>/g)].map((m) => m[1]);
assert.deepEqual(labels.slice(-5), ['12', '12', '12', '12', '12'], 'with values, each bar carries its total');

// Long labels wrap on a narrow chart, and the y axis can carry words.
const long = { rows: [{ k: 'Before the works', v: 3 }, { k: 'After', v: 2 }], x: 'k', series: [{ key: 'v', label: 'V', color: 'var(--c-chart-1)' }], unit: 'u', yLabel: 'units a year' };
const wrapped = renderPlot(bars({ ...long, wrap: () => 5 }, 300));
assert.ok(!/>Before the works</.test(wrapped) && /Before/.test(wrapped), 'a long label wraps onto more lines');
assert.ok(/>Before the works</.test(renderPlot(bars(long, 300))), 'without wrap it stays on one line');
assert.ok(/units a year/.test(wrapped), 'the y axis carries its words');
const small = renderPlot(bars({ ...long, rows: [{ k: 'A', v: 0.3 }, { k: 'B', v: 1.2 }], yDigits: 2 }, 300));
assert.ok(/>0\.40</.test(small) && !/>1</.test(small), 'small values keep their decimals on the y axis');

// Grouped: last year beside this one, each bar from zero, a run of steps shaded.
const pairs = [
  { m: 'M1', old: 30, now: 20 },
  { m: 'M2', old: 10, now: 12 },
  { m: 'M3', old: null, now: null },
  { m: 'M4', old: null, now: null },
  { m: 'M5', old: 5, now: null },
];
const two = [
  { key: 'old', label: 'Then', color: 'var(--c-chart-2)', tag: '’24' },
  { key: 'now', label: 'Now', color: 'var(--c-chart-1)', tag: '’25' },
];
const g = bars({ rows: pairs, x: 'm', series: two, unit: 'units', grouped: true, shade: { from: 'M3', to: 'M4', text: 'left out' } }, 500);
const gSvg = renderPlot(g);
assert.deepEqual(g.y.domain, [0, 30], 'grouped, the y domain holds the highest bar, not a sum');
const [oldBars, , nowBars] = g.marks.slice(5);
assert.deepEqual([oldBars.data[0].y1, oldBars.data[0].y2, nowBars.data[0].y1, nowBars.data[0].y2], [0, 30, 0, 20], 'each bar stands on zero');
// The two bars of a step side by side, 2px apart, centred in the step and no wider than 14px.
// Each bar's left and right edge: the least and greatest x its path visits.
const rects = (color) => [...gSvg.matchAll(new RegExp(`fill="var\\(--c-${color}\\)"[^>]*>((?:<path[^>]*>)+)`, 'g'))]
  .flatMap((m) => [...m[1].matchAll(/ d="([^"]+)"/g)])
  .map(([, d]) => {
    const xs = [...d.matchAll(/(?:[MLH]|0 0 1 )([\d.]+)/g)].map((n) => Number(n[1]));
    return [Math.min(...xs), Math.max(...xs)];
  });
const [o1, n1] = [rects('chart-2')[0], rects('chart-1')[0]];
assert.ok(o1 && n1, 'both bars of the first step are drawn');
assert.ok(Math.abs(n1[0] - o1[1] - 2) < 0.01, 'the second bar starts 2px after the first ends');
assert.ok(o1[1] - o1[0] <= 14.001, 'no bar is wider than 14px');
assert.ok(gSvg.includes('>left out<'), 'the shaded run says why');
assert.ok(gSvg.includes('>’24<') && gSvg.includes('>’25<'), 'each series carries its tag over its first bar');
const gTip = g.marks.at(-1);
assert.equal(gTip.data.length, 5, 'grouped, every step has a tooltip, even an empty one');
assert.equal(gTip.channels.title.value(pairs[0]), 'M1\nThen  30\nNow  20\nunits', 'grouped, the tooltip lists the series in order');
assert.equal(gTip.channels.title.value(pairs[2]), 'M3\nunits', 'an empty step says only its label and unit, not 0');
assert.ok(!renderPlot(bars({ ...spec, grouped: false }, 600)).includes('left out'), 'no shade unless asked');

console.log('bars: all assertions pass');

// Callouts: a figure over each bar picked, always on, centred on its own bar.
{
  const c = bars({ rows: pairs, x: 'm', series: two, unit: 'units', grouped: true, callout: (r, s) => r.m === 'M1' || (r.m === 'M5' && s.key === 'old') }, 500);
  const cSvg = renderPlot(c);
  const figures = [...cSvg.matchAll(/font-weight="600"[^>]*>((?:<text[^>]*>[^<]*<\/text>)+)/g)]
    .flatMap((m) => [...m[1].matchAll(/>([^<]+)<\/text>/g)].map((t) => t[1]));
  assert.deepEqual(figures.sort(), ['20', '30', '5'], 'each picked bar says its own figure, and only those');
  const stacked = renderPlot(bars({ ...spec, callout: (r) => r.month === 'M4' }, 600));
  assert.ok(/font-weight="600"[^>]*><text[^>]*>23\.0<\/text>/.test(stacked), 'stacked, a callout is the total over the whole bar');
  assert.ok(!/font-weight="600"/.test(svg), 'no callouts unless asked');
}

// The shade spans the frame and no further: from the bottom of the scale to its rounded top.
{
  const block = g.marks.find((m) => m.data?.[0]?.m === 'M3' && m.data.length === 2);
  assert.ok(block, 'the shaded block is a mark of its own');
  assert.equal(block.insetTop, 0, 'the block reaches the top of the frame, no further');
  assert.equal(block.insetBottom, 0, 'and stops at the bottom of the scale, not below the axis');
}

// A tag sits on the first bar with a value, above any taller bar it runs over.
{
  const climb = [
    { m: 'A', a: null, b: 0 },
    { m: 'B', a: null, b: 2 },
    { m: 'C', a: 40, b: 9 },
    { m: 'D', a: 30, b: 3 },
  ];
  // The second series' tag grows rightward, over the steps after its bar.
  const t = bars({ rows: climb, x: 'm', series: [{ key: 'a', label: 'A', color: 'var(--c-chart-2)' }, { key: 'b', label: 'B', color: 'var(--c-chart-1)', tag: 'Prototype' }], grouped: true }, 160);
  const tag = t.marks.find((m) => m.constructor.name === 'Text' && m.data?.[0]?.m && m.channels?.text?.value?.() === 'Prototype');
  assert.equal(tag.data[0].m, 'B', 'a first bar of zero carries no tag; the first with a value does');
  assert.equal(tag.channels.y.value(), 40, 'the tag clears the taller bar beside it');
}

// Labels in the system sans with tabular figures, not monospace.
assert.ok(!/monospace/.test(svg), 'no monospace in a chart');
assert.ok(/system-ui/.test(svg), 'the system sans');

console.log('bars: callouts, shade and tags pass');

// pointer: false leaves out Plot's tooltip and hover band, for a page that draws its own.
{
  const own = bars({ ...spec, pointer: false }, 600);
  const names = (o) => o.marks.flat().filter(Boolean).map((m) => m.constructor.name);
  assert.ok(names(options).includes('Tip'), "Plot's tip is there by default");
  assert.ok(!names(own).includes('Tip'), 'no tip with pointer: false');
  assert.ok(!own.marks.flat().some((m) => m?.fill === 'var(--c-surface-hover)'), 'no hover band with pointer: false');
  assert.equal(names(options).length - names(own).length, 2, 'only those two are left out');
}
