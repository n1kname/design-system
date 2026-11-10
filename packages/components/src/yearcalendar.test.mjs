// Synthetic days only.
import assert from 'node:assert/strict';
import { calendarHTML, evenSteps, HEAT, stepOf, toneRamp, yearWeeks } from './yearcalendar.js';

// Weeks: from the week holding 1 January to the week holding 31 December.
const mon = yearWeeks(2026);
assert.equal(mon.length, 53);
assert.equal(mon[0][0], '2025-12-29', 'Monday on or before 1 January');
assert.ok(mon[0].includes('2026-01-01'));
assert.ok(mon.at(-1).includes('2026-12-31'));
assert.ok(mon.every((w) => w.length === 7));
const sun = yearWeeks(2026, 0);
assert.equal(sun[0][0], '2025-12-28', 'Sunday on or before 1 January');
assert.equal(new Date(`${sun[0][0]}T12:00:00Z`).getUTCDay(), 0);
// A leap year whose 1 January is a Monday starts on it.
assert.equal(yearWeeks(2024)[0][0], '2024-01-01');
// Every day of the year exactly once.
const days2024 = yearWeeks(2024).flat().filter((d) => d.startsWith('2024-'));
assert.equal(days2024.length, 366);
assert.equal(new Set(days2024).size, 366);

// Steps: even shares of the values above zero, one fewer than the colours.
assert.deepEqual(evenSteps([1, 2, 3, 4, 5, 6, 7, 8, 0, 0], 4), [3, 5, 7]);
assert.deepEqual(evenSteps([0, 0], 4), [], 'nothing above zero');
assert.deepEqual(evenSteps([5, 5, 5], 3), [5, 5], 'all alike');
assert.deepEqual(evenSteps([1, 2], 1), [], 'one colour has no steps');
assert.equal(stepOf(0, [3, 5]), 0, 'nothing is no step');
assert.equal(stepOf(1, [3, 5]), 1, 'anything above zero is the first colour at least');
assert.equal(stepOf(3, [3, 5]), 2, 'a step starts at its value');
assert.equal(stepOf(99, [3, 5]), 3);
assert.equal(stepOf(5, [5, 5]), 3, 'all alike: the top colour');

// One tone in strengths, the last the tone itself.
assert.deepEqual(toneRamp('var(--c-chart-6)', 1), ['var(--c-chart-6)']);
const four = toneRamp('var(--c-chart-6)', 4);
assert.equal(four.length, 4);
assert.equal(four.at(-1), 'var(--c-chart-6)');
assert.match(four[0], /^color-mix\(in oklab, var\(--c-chart-6\) 35%, var\(--c-surface\)\)$/);

// Markup.
const days = { '2026-01-01': 3, '2026-03-02': 1, '2026-03-03': { value: 0 }, '2025-12-31': 5 };
const html = calendarHTML({ year: 2026, days, today: '2026-11-10', total: (n) => `${n} km`, label: 'Runs "in" 2026' });
assert.equal((html.match(/data-day=/g) ?? []).length, 365, 'a cell for every day of the year');
assert.equal((html.match(/class="out"/g) ?? []).length, 53 * 7 - 365, 'the other days hold their place');
assert.equal((html.match(/class="on"/g) ?? []).length, 2, 'a day from another year, or with 0, is not drawn');
assert.equal((html.match(/class="later"/g) ?? []).length, 51, 'the days after today are paler');
assert.match(html, /aria-label="Runs &quot;in&quot; 2026"/, 'the label stays one attribute');
assert.match(html, /--weeks: 53/);
for (let i = 1; i <= 6; i++) assert.ok(html.includes(`--yc-${i}: ${HEAT[i - 1]}`), 'the heat ramp by default');
assert.match(html, /<th scope="row">January<\/th><td>1<\/td><td>3 km<\/td>/, 'the table: days and total by month');
assert.match(html, /<th scope="row">March<\/th><td>1<\/td><td>1 km<\/td>/);
assert.ok(!calendarHTML({ year: 2026, table: false }).includes('<table'), 'table: false leaves it out');
assert.ok(!calendarHTML({ year: 2026 }).includes('class="later"'), 'without today, nothing is still to come');
assert.match(calendarHTML({ year: 2026 }), /2026: 0 days with something/);
assert.match(calendarHTML({ year: 2026, days: { '2026-02-01': 1 } }), /2026: 1 day with something/);

// Month names over the week holding the 1st.
assert.match(html, /<span style="--at: 0.000%" data-short="J">Jan<\/span>/);
const feb = Math.floor((Date.UTC(2026, 1, 1) - Date.UTC(2025, 11, 29)) / 86_400_000 / 7);
assert.ok(html.includes(`--at: ${((feb / 53) * 100).toFixed(3)}%" data-short="F">Feb`));

// Weekday letters: M, W, F on the rows they name.
assert.match(html, /<span>M<\/span><span><\/span><span>W<\/span><span><\/span><span>F<\/span><span><\/span><span><\/span>/);
assert.match(calendarHTML({ year: 2026, weekStart: 0 }), /<span><\/span><span>M<\/span><span><\/span><span>W<\/span>/);

// One tone, and given steps.
const toned = calendarHTML({ year: 2026, tone: 'var(--c-chart-3)', levels: 1, days: { '2026-05-05': 9 } });
assert.ok(toned.includes('--yc-1: var(--c-chart-3)') && !toned.includes('--yc-2'));
const stepped = calendarHTML({ year: 2026, steps: [10], colors: ['a', 'b'], days: { '2026-05-05': 9, '2026-05-06': 10 } });
assert.match(stepped, /data-day="2026-05-05" data-step="1"/);
assert.match(stepped, /data-day="2026-05-06" data-step="2"/);
assert.throws(() => calendarHTML({ year: 2026, colors: Array(10).fill('red') }), /at most 9 colours/);

// value reads the number from an entry.
const read = calendarHTML({ year: 2026, days: { '2026-06-01': { count: 2, km: 5 } }, value: (d) => d.count });
assert.match(read, /data-day="2026-06-01" data-step="\d"/);
console.log('yearcalendar: all assertions pass');
