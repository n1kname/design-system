// Synthetic months only.
import assert from 'node:assert/strict';
import { fillMonths, fullMonth, monthTicks, padFor } from './months.mjs';

assert.equal(fullMonth('2026-04'), 'April 2026');
assert.equal(fullMonth('Q1'), 'Q1', 'anything else as it is');

const filled = fillMonths([{ month: '2025-11', v: 1 }, { month: '2026-02', v: 2 }]);
assert.deepEqual(filled.map((r) => r.month), ['2025-11', '2025-12', '2026-01', '2026-02'], 'every month between');
assert.deepEqual(filled[1], { month: '2025-12' }, 'a missing month has no figures');
assert.deepEqual(fillMonths([]), []);

const months = Array.from({ length: 36 }, (_, i) => `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
const ticks = (width) => months.map((m, i) => monthTicks(months, 40)(m, i, width)).filter(Boolean);
// Wide, every quarter; narrow, every January, each with its year.
assert.deepEqual(ticks(900).slice(0, 3), ['Jan\n2024', 'Apr', 'Jul'], 'quarters when there is room');
assert.deepEqual(ticks(400), ['Jan\n2024', 'Jul', 'Jan\n2025', 'Jul', 'Jan\n2026', 'Jul'], 'half years with less');
assert.deepEqual(ticks(250), ['Jan\n2024', 'Jan\n2025', 'Jan\n2026'], 'Januaries with less still');
assert.ok(ticks(5000).length === 36, 'every month on a wide chart');

assert.equal(padFor(1000, 36), 0.15, 'room for a gap');
assert.equal(padFor(200, 154), 0, 'thin bars touch');
console.log('months: all assertions pass');
