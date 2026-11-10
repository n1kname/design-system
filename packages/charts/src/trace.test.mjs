// Synthetic values only: a made-up beat repeated, not a recording.
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { envelope, stripSeconds, trace, traceSummary } from './trace.mjs';

const svg = (html) => parseHTML(`<div>${html}</div>`).document.querySelector('svg');

// A beat a second at 512 Hz: flat, with one sample-wide spike of 1,200 µV in each second.
const rate = 512;
const beats = (seconds) => Array.from({ length: seconds * rate }, (_, i) => (i % rate === 200 ? 1200 : i % rate === 210 ? -300 : 20));

assert.equal(trace([], { rate }), '', 'nothing to draw, no svg');
assert.equal(trace([1, 2, 3]), '', 'no rate, no svg');

// Strips: 10 s when wide, shorter when narrow; a 30 s recording is three strips at 800px.
assert.equal(stripSeconds(800), 10);
assert.equal(stripSeconds(340), 5);
assert.equal(stripSeconds(120), 2.5);
const wide = svg(trace(beats(30), { rate, width: 800 }));
assert.equal(wide.getAttribute('data-rows'), '3');
assert.equal(wide.querySelectorAll('.trace-strip').length, 3);
assert.equal(wide.querySelectorAll('.enter-line .trace-line').length, 3, 'a line per strip, tagged to draw in');
assert.deepEqual([...wide.querySelectorAll('.trace-time')].map((t) => t.textContent), ['0 s', '10 s', '20 s']);
assert.equal(svg(trace(beats(31), { rate, width: 800 })).getAttribute('data-rows'), '4', 'a second past the strips starts another');
assert.equal(svg(trace(beats(30), { rate, width: 340 })).getAttribute('data-rows'), '6');

// The envelope keeps every spike, however narrow, where every nth sample would lose them.
const one = beats(30);
const kept = envelope(one, 600);
assert.ok(kept.length <= 1200, 'at most two points a column');
assert.equal(kept.filter(([, v]) => v === 1200).length, 30, 'all thirty spikes survive');
assert.equal(kept.filter(([, v]) => v === -300).length, 30, 'and their dips');
assert.ok(kept.every(([i], k) => k === 0 || i > kept[k - 1][0]), 'in sample order');
const naive = one.filter((_, i) => i % Math.floor(one.length / 800) === 0);
assert.ok(naive.filter((v) => v === 1200).length < 30, 'taking every nth sample loses spikes: why the envelope exists');
assert.deepEqual(envelope([1, 2, 3], 10), [[0, 1], [1, 2], [2, 3]], 'few samples are kept as they are');

// The paper: squares as wide in time as they are tall in millivolts (0.2 s = 0.5 mV).
const paper = svg(trace(beats(10), { rate, width: 800 }));
assert.equal(paper.getAttribute('data-minor'), '0.2', 'at 80px a second, 0.04 s squares would be 3px: left out');
const verticals = [...paper.querySelector('.trace-minor').getAttribute('d').matchAll(/M([\d.]+) [\d.]+V/g)].map((m) => +m[1]);
const horizontals = [...paper.querySelector('.trace-minor').getAttribute('d').matchAll(/M0 ([\d.]+)H/g)].map((m) => +m[1]).sort((a, b) => a - b);
assert.ok(Math.abs(verticals[1] - verticals[0] - (horizontals[1] - horizontals[0])) < 0.2, 'square squares');
assert.equal(svg(trace(beats(10), { rate, width: 4000 })).getAttribute('data-minor'), '0.04', 'wide enough: the finest squares');

// A line never leaves its paper, even for an artefact far off the scale.
const wild = svg(trace([...beats(2), 90000, ...beats(2)], { rate, width: 800, seconds: 10 }));
const ys = [...wild.querySelector('.trace-line').getAttribute('d').matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => +m[1]);
assert.ok(Math.max(...ys) <= +wild.getAttribute('height') && Math.min(...ys) >= 0, 'clamped to the paper');

// Named for a screen reader; the summary says what it holds.
assert.equal(svg(trace(beats(1), { rate, label: 'ECG <today>' })).getAttribute('aria-label'), 'ECG <today>');
assert.equal(traceSummary(15360, 512, { locale: 'en' }), '15,360 samples at 512 Hz, 30.0 s');
console.log('trace: ok');
