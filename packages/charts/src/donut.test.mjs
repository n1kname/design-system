// Synthetic data only, like everything in this repo.
import assert from 'node:assert/strict';
import { donutRing, slices } from './donut.mjs';

const data = [
  { label: 'Alpha & co', value: 50, valueLabel: '50%', color: 'var(--c-chart-1)', strong: true },
  { label: 'Beta', value: 30, valueLabel: '30%' },
  { label: 'Gamma', value: 20, valueLabel: '20%' },
];

const parts = slices(data, { inner: 50, outer: 100 });
assert.equal(parts.length, 3);
assert.ok(Math.abs(parts[0].mid - Math.PI / 2) < 1e-9, 'first slice starts at 12 o\'clock, runs clockwise');
assert.ok(parts[0].mid < parts[1].mid && parts[1].mid < parts[2].mid, 'input order is kept');

const svg = donutRing(data, { title: ['Title & more'] });
assert.ok(svg.includes('Alpha &amp; co'), 'labels are escaped');
assert.ok(svg.includes('Title &amp; more'), 'the title is escaped');
assert.ok(svg.includes('var(--c-chart-1)'), 'an explicit colour is used');
assert.ok(svg.includes('var(--c-chart-neutral)'), 'the rest fall back to the neutral tone');
assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'no hex: colours are tokens');
console.log('donut: all assertions pass');
