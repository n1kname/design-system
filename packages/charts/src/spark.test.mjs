// Synthetic values only.
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { sparkline } from './spark.mjs';

const svg = (html) => parseHTML(`<div>${html}</div>`).document.querySelector('svg');

assert.equal(sparkline([]), '', 'nothing to draw, no svg');
assert.equal(sparkline([null, null]), '', 'only gaps, no svg');
assert.throws(() => sparkline([1], { kind: 'pie' }), /kind is one of/);

// Bars: one per value, from the baseline, a gap left empty.
const bars = svg(sparkline([4, 8, null, 2], { kind: 'bar' }));
assert.equal(bars.getAttribute('data-kind'), 'bar');
assert.equal(bars.querySelectorAll('rect').length, 3, 'a missing value draws no bar');
assert.equal(bars.getAttribute('aria-hidden'), 'true', 'hidden without a label');
const heights = [...bars.querySelectorAll('rect')].map((r) => Number(r.getAttribute('height')));
assert.ok(heights[1] > heights[0] && heights[0] > heights[2], 'taller for more');
const bottoms = [...bars.querySelectorAll('rect')].map((r) => Number(r.getAttribute('y')) + Number(r.getAttribute('height')));
assert.ok(bottoms.every((b) => Math.abs(b - bottoms[0]) < 0.02), 'every bar stands on the baseline');

// Many bars are thinner.
const thin = svg(sparkline(Array.from({ length: 12 }, (_, i) => i + 1)));
assert.ok(Number(thin.querySelector('rect').getAttribute('width')) <= 4);

// The reference: drawn inside the scale, left out above it.
assert.ok(svg(sparkline([4, 8], { reference: 6 })).querySelector('.spark-ref'), 'a reference inside is dashed across');
assert.equal(svg(sparkline([4, 8], { reference: 20 })).querySelector('.spark-ref'), null, 'a reference above the top is left out');
assert.equal(svg(sparkline([4, 8], { reference: null })).querySelector('.spark-ref'), null);

// Lines: a path per run, broken at a gap; a lone value is a dot.
const line = svg(sparkline([3, 5, null, 4, 6], { kind: 'line' }));
assert.equal(line.querySelectorAll('.spark-stroke').length, 2, 'a gap breaks the line');
assert.equal(line.querySelector('.spark-fill'), null, 'a line has no fill');
const lone = svg(sparkline([3, null, 5], { kind: 'line' }));
assert.equal(lone.querySelectorAll('.spark-dot').length, 2, 'a value between gaps is a dot');

// Areas: a fill under each run, closed on the baseline.
const area = svg(sparkline([3, 5, 4], { kind: 'area', last: true }));
assert.equal(area.querySelectorAll('.spark-fill').length, 1);
assert.match(area.querySelector('.spark-fill').getAttribute('d'), /Z$/);
assert.ok(area.querySelector('.spark-last'), 'last: a dot on the newest value');

// A label makes it an image with a name.
const named = svg(sparkline([1, 2], { label: 'Steps, last 12 months <rising>' }));
assert.equal(named.getAttribute('role'), 'img');
assert.equal(named.getAttribute('aria-label'), 'Steps, last 12 months <rising>');

// Below zero: the baseline moves up, bars run down from it.
const neg = svg(sparkline([-2, 4], { kind: 'bar' }));
const [down, up] = [...neg.querySelectorAll('rect')].map((r) => ({ y: Number(r.getAttribute('y')), h: Number(r.getAttribute('height')) }));
assert.ok(Math.abs(down.y - (up.y + up.h)) < 0.02, 'a negative bar hangs from the baseline');

// zero: false scales a line to its own values; bars keep zero.
const flat = svg(sparkline([7.0, 7.2], { kind: 'line' })).querySelector('.spark-stroke').getAttribute('d');
const own = svg(sparkline([7.0, 7.2], { kind: 'line', zero: false })).querySelector('.spark-stroke').getAttribute('d');
const rise = (d) => { const ys = [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1])); return ys[0] - ys[1]; };
assert.ok(rise(own) > rise(flat) * 5, 'its own range shows the change');
assert.ok(svg(sparkline([7.0, 7.2], { kind: 'line', zero: false, reference: 7.1 })).querySelector('.spark-ref'), 'a reference inside its range');
assert.equal(svg(sparkline([7.0, 7.2], { kind: 'line', zero: false, reference: 3 })).querySelector('.spark-ref'), null, 'one below it is left out');
const areaOwn = svg(sparkline([7.0, 7.2], { kind: 'area', zero: false, height: 44 })).querySelector('.spark-fill').getAttribute('d');
assert.match(areaOwn, / 42Z$/, 'an area on its own range closes on the foot');
const keepBars = svg(sparkline([7.0, 7.2], { kind: 'bar', zero: false }));
assert.ok(Number(keepBars.querySelector('rect').getAttribute('height')) > 30, 'bars always stand on zero');

// Size.
const big = svg(sparkline([1, 2], { width: 120, height: 32 }));
assert.equal(big.getAttribute('viewBox'), '0 0 120 32');
console.log('spark: all assertions pass');
