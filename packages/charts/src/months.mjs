// Monthly series: every month on the axis, the gaps kept as gaps, the labels chosen by the room each
// month has, and bars that touch once they are too thin for a gap. For bars() and lines() over
// "YYYY-MM" steps, at build time or in the page.

const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const isMonth = (m) => /^\d{4}-\d{2}$/.test(m);

// "2026-04" → "April 2026", for a tooltip or a table.
export const fullMonth = (m) => (isMonth(m) ? `${LONG[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` : m);

// Every month from the first row's to the last's, so a month without figures is a gap on the axis,
// not a closed-up step. A missing month is { [key]: month } and nothing else.
export const fillMonths = (rows, key = 'month') => {
  if (!rows.length) return rows;
  const by = new Map(rows.map((r) => [r[key], r]));
  let [y, m] = rows[0][key].split('-').map(Number);
  const [y1, m1] = rows[rows.length - 1][key].split('-').map(Number);
  const out = [];
  while (y < y1 || (y === y1 && m <= m1)) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    out.push(by.get(k) ?? { [key]: k });
    if (++m > 12) [y, m] = [y + 1, 1];
  }
  return out;
};

// Which months the axis names, by the room each has: every month, quarter, half year, January, or
// every second, third, fifth or tenth January, the first whose labels don't touch. The first named
// month and every January carry the year on a second line, so the axis always says which year it
// is. Takes the months in order and the chart's side margins; gives bars' and lines' `tick`.
const ROOM = 40;
const STRIDES = [1, 3, 6, 12, 24, 36, 60, 120];
export const monthTicks = (months, marginLeft, marginRight = 4) => (m, i, width) => {
  if (!isMonth(m)) return m;
  const step = (width - marginLeft - marginRight) / months.length;
  const every = STRIDES.find((n) => step * n >= ROOM) ?? STRIDES.at(-1);
  const first = Number(months[0]?.slice(0, 4));
  const named = (k) => (every <= 12 ? (Number(k.slice(5)) - 1) % every === 0 : k.endsWith('-01') && (Number(k.slice(0, 4)) - first) % (every / 12) === 0);
  if (!named(m)) return '';
  const name = SHORT[Number(m.slice(5)) - 1];
  return m.endsWith('-01') || months.find(named) === m ? `${name}\n${m.slice(0, 4)}` : name;
};

// Bars too thin for a gap between them touch instead: a sliver of gap only blurs them.
export const padFor = (width, n, margins = 44, padding = 0.15) => ((width - margins) / n < 5 ? 0 : padding);
