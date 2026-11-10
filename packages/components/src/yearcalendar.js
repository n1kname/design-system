// Fills a YearCalendar: one year of days in a grid, a week to a column and a weekday to a row, each
// day coloured by its step. HTML, not a chart library, because a day is a square of colour and
// nothing else, and the squares share the width they have, so the year fits a phone.
//
//     import { setYearCalendar } from '@n1kname/components/yearcalendar.js';
//     setYearCalendar(box, { year: 2026, days: { '2026-03-02': 2, '2026-03-04': 1 }, format: (n) => `${n} runs` });
//
// `days` maps an ISO date to a number, or to anything when `value` reads the number from it. A day
// with no entry, or a value of 0, is empty: grey, never the lowest colour. Colours are a ramp, low
// to high: the heat tokens by default, any list in `colors`, or one `tone` in `levels` strengths.
// `steps` says where each colour after the first starts, as for the heatmap chart; by default the
// days' values are split into even shares.
//
// Pointing at a day, or reaching it with the arrow keys, shows the charts' pointer card: the date,
// the day's figure and any `extra`. The grid is one tab stop: right and left go a week on, up and
// down a day, Page Up and Page Down a month, Home and End to the first and last day. Each step is
// said in a polite live region. A table by month, for screen readers, says how many days had
// something and, with `total`, how much.
//
// calendarHTML() is the markup alone, without the browser: YearCalendar uses it to draw the empty
// year at build time, so nothing moves when the days arrive.

// Text and attributes alike, so a label with quotes stays one attribute.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The heat ramp, cold to warm, as tokens. */
export const HEAT = [1, 2, 3, 4, 5, 6].map((i) => `var(--c-heat-${i})`);
/** At most this many colours: the stylesheet has a rule for each. */
export const MAX_COLOURS = 9;

const iso = (t) => new Date(t).toISOString().slice(0, 10);
const utc = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
const DAY = 86_400_000;
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * The year's weeks, each a column of seven ISO dates from the week's first day (Monday by default,
 * Sunday with weekStart 0), from the week holding 1 January to the week holding 31 December.
 */
export const yearWeeks = (year, weekStart = 1) => {
  const jan1 = Date.UTC(year, 0, 1);
  const dec31 = Date.UTC(year, 11, 31);
  let t = jan1 - ((new Date(jan1).getUTCDay() - weekStart + 7) % 7) * DAY;
  const weeks = [];
  while (t <= dec31) {
    weeks.push(Array.from({ length: 7 }, (_, i) => iso(t + i * DAY)));
    t += 7 * DAY;
  }
  return weeks;
};

/** A ramp of one colour: `levels` strengths of `tone` mixed into the surface, the last the tone itself. */
export const toneRamp = (tone, levels = 4) =>
  Array.from({ length: levels }, (_, i) => {
    const p = levels === 1 ? 100 : Math.round(35 + (65 * i) / (levels - 1));
    return p === 100 ? tone : `color-mix(in oklab, ${tone} ${p}%, var(--c-surface))`;
  });

/**
 * Where each colour after the first starts, when none are given: the values above zero split into
 * even shares, so every colour is used when the values allow it. One fewer than the colours.
 */
export const evenSteps = (values, colours) => {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length || colours < 2) return [];
  return Array.from({ length: colours - 1 }, (_, k) => sorted[Math.floor(((k + 1) * sorted.length) / colours)] ?? sorted.at(-1));
};

/** The step of a value: 0 for nothing, 1 for the first colour, up to the number of colours. */
export const stepOf = (v, steps) => (v > 0 ? 1 + steps.filter((s) => v >= s).length : 0);

const options = (o) => {
  const { year, days = {}, value = (d) => (typeof d === 'number' ? d : (d?.value ?? 0)), weekStart = 1, tone, levels = 4 } = o;
  const colors = o.colors ?? (tone ? toneRamp(tone, levels) : HEAT);
  if (colors.length > MAX_COLOURS) throw new Error(`YearCalendar: at most ${MAX_COLOURS} colours, not ${colors.length}`);
  const inYear = Object.entries(days).filter(([d]) => d.startsWith(`${year}-`));
  const steps = o.steps ?? evenSteps(inYear.map(([, d]) => value(d)), colors.length);
  return { ...o, year, days, value, weekStart, colors, steps };
};

/**
 * The calendar's markup, as a string: what setYearCalendar draws, without the browser. Takes the
 * same options; `today` is left out unless given, so a build draws no day as still to come.
 */
export const calendarHTML = (opts) => {
  const { year, days, value, weekStart, colors, steps, today, label, total, months = MONTHS, monthNames = LONG_MONTHS, weekdays, words = {} } = options(opts);
  const say = { month: 'Month', days: 'Days', total: 'Total', ...words };
  const weeks = yearWeeks(year, weekStart);
  const letters = weekdays ?? (weekStart === 1 ? ['M', '', 'W', '', 'F', '', ''] : ['', 'M', '', 'W', '', 'F', '']);
  const prefix = `${year}-`;

  // A month's name over the week holding its first day.
  const first = weeks[0][0];
  const heads = months
    .map((m, i) => {
      const at = Math.floor((utc(`${year}-${String(i + 1).padStart(2, '0')}-01`) - utc(first)) / DAY / 7);
      return `<span style="--at: ${((at / weeks.length) * 100).toFixed(3)}%" data-short="${esc(m.slice(0, 1))}">${esc(m)}</span>`;
    })
    .join('');

  let active = 0;
  const byMonth = Array.from({ length: 12 }, () => ({ days: 0, sum: 0 }));
  const cells = weeks
    .flat()
    .map((d) => {
      if (!d.startsWith(prefix)) return '<i class="out"></i>';
      const entry = days[d];
      const v = entry === undefined ? 0 : Number(value(entry)) || 0;
      const step = stepOf(v, steps);
      if (step) {
        active++;
        const m = byMonth[Number(d.slice(5, 7)) - 1];
        m.days++;
        m.sum += v;
      }
      const cls = step ? 'on' : today && d > today ? 'later' : 'off';
      return `<i class="${cls}" data-day="${d}"${step ? ` data-step="${step}"` : ''}></i>`;
    })
    .join('');

  const named = label ?? `${year}: ${active} day${active === 1 ? '' : 's'} with something`;
  const ramp = colors.map((c, i) => `--yc-${i + 1}: ${c}`).join('; ');
  const table =
    opts.table === false
      ? ''
      : `<table class="yc-sr"><caption>${esc(named)}</caption><thead><tr><th scope="col">${esc(say.month)}</th><th scope="col">${esc(say.days)}</th>${total ? `<th scope="col">${esc(say.total)}</th>` : ''}</tr></thead><tbody>${byMonth
          .map((m, i) => `<tr><th scope="row">${esc(monthNames[i])}</th><td>${m.days}</td>${total ? `<td>${esc(total(m.sum, i))}</td>` : ''}</tr>`)
          .join('')}</tbody></table>`;

  return (
    `<div class="yc-frame" style="--weeks: ${weeks.length}; ${ramp}">` +
    `<div class="yc-months" aria-hidden="true">${heads}</div>` +
    `<div class="yc-wd" aria-hidden="true">${letters.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` +
    `<div class="yc-grid" role="img" aria-label="${esc(named)}">${cells}</div>` +
    `</div>${table}`
  );
};

const longDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// The card's words, as the charts' pointer writes them: the date quiet, the figure bold beside its
// colour, then [label, value] rows and lines of text from `extra`.
const cardHTML = (title, line, step, extra) => {
  const pairs = extra.filter(Array.isArray);
  const notes = extra.filter((e) => !Array.isArray(e));
  return (
    `<p class="chart-pointer-title">${esc(title)}</p>` +
    // A day with nothing says so quietly, as a note; a day with something, bold beside its colour.
    (line ? (step ? `<p class="chart-pointer-one"><i style="background: var(--yc-${step})"></i>${esc(line)}</p>` : `<p class="chart-pointer-note">${esc(line)}</p>`) : '') +
    (pairs.length ? `<dl>${pairs.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '') +
    notes.map((n) => `<p class="chart-pointer-note">${esc(n)}</p>`).join('')
  );
};

/**
 * Draws the calendar into `box` (a YearCalendar, or any element) and wires its card and keys.
 * Call it again with new days to draw it again.
 *
 * year; days; value (entry) → number; colors, or tone and levels; steps; weekStart (1 Monday, 0
 * Sunday); today (ISO, default the reader's; later days are paler); label: what the grid says to a
 * screen reader, such as "Running in 2026: 84 days"; format (entry, iso) → the card's figure;
 * empty: the card's words for a day with nothing (default none); date (iso) → the card's title;
 * extra (entry, iso) → [label, value] pairs and lines of text for the card; total (sum, month) →
 * the month table's total, which it leaves out without one; table: false to leave the table out;
 * months, monthNames, weekdays and words for other words.
 */
export const setYearCalendar = (box, opts) => {
  const o = options({ today: localToday(), ...opts });
  const { days, value, format = (d) => String(value(d)), empty, date = longDate, extra = () => [], today } = o;
  box.classList.add('year-calendar');
  box.innerHTML = calendarHTML(o);

  const frame = box.querySelector('.yc-frame');
  const grid = box.querySelector('.yc-grid');
  const cells = [...grid.querySelectorAll('[data-day]')];
  const index = new Map(cells.map((c, i) => [c.dataset.day, i]));

  // The layer the charts' pointer uses (pointer.css): a frame round the day and the card.
  const layer = document.createElement('div');
  layer.className = 'chart-pointer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="chart-pointer-cell"></div><div class="chart-pointer-card"></div>';
  frame.append(layer);
  const [ring, card] = layer.children;
  const live = document.createElement('p');
  live.className = 'chart-pointer-live';
  live.setAttribute('aria-live', 'polite');
  box.append(live);

  let at = -1;
  let hide;
  const leave = () => {
    clearTimeout(hide);
    hide = setTimeout(() => {
      layer.classList.remove('is-on');
      at = -1;
    }, 120);
  };

  const show = (i, fromKeys) => {
    if (i < 0 || i >= cells.length) return;
    clearTimeout(hide);
    at = i;
    const cell = cells[i];
    const d = cell.dataset.day;
    const entry = cell.dataset.step ? days[d] : undefined;
    const line = entry !== undefined ? format(entry, d) : empty;
    const more = entry !== undefined ? (extra(entry, d) ?? []) : [];
    card.innerHTML = cardHTML(date(d), line, entry !== undefined ? Number(cell.dataset.step) : 0, more);

    const f = frame.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    const left = c.left - f.left;
    const top = c.top - f.top;
    ring.style.width = `${c.width}px`;
    ring.style.height = `${c.height}px`;
    ring.style.transform = `translate(${left}px, ${top}px)`;
    // Above the day, centred and kept inside the calendar; below it when there's no room above.
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const cx = Math.min(Math.max(left + c.width / 2 - cw / 2, 0), Math.max(f.width - cw, 0));
    const cy = top - ch - 8 >= 0 ? top - ch - 8 : top + c.height + 8;
    card.style.transform = `translate(${cx}px, ${cy}px)`;

    const first = !layer.classList.contains('is-on');
    layer.classList.toggle('is-jump', first);
    layer.classList.add('is-on');
    if (first) requestAnimationFrame(() => layer.classList.remove('is-jump'));
    if (fromKeys) {
      const said = [line, ...more.map((e) => (Array.isArray(e) ? e.join(' ') : e))].filter(Boolean);
      live.textContent = `${date(d)}${said.length ? `: ${said.join(', ')}` : ''}`;
    }
  };

  grid.onpointermove = (e) => {
    const cell = e.target.closest?.('[data-day]');
    if (cell) show(index.get(cell.dataset.day));
  };
  grid.onpointerleave = leave;

  // The keys start from today in this year, otherwise from its last day with something, or 1 January.
  const start = () => index.get(today) ?? cells.findLastIndex((c) => c.dataset.step) ?? 0;
  const month = (i, by) => {
    const [y, m, dd] = cells[i].dataset.day.split('-').map(Number);
    const to = new Date(Date.UTC(y, m - 1 + by, 1));
    const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate();
    return index.get(iso(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), Math.min(dd, last)))) ?? i;
  };
  grid.tabIndex = 0;
  grid.onfocus = () => {
    if (grid.matches(':focus-visible')) show(at < 0 ? Math.max(start(), 0) : at, true);
  };
  grid.onblur = leave;
  grid.onkeydown = (e) => {
    if (e.key === 'Escape') return leave();
    const from = at < 0 ? Math.max(start(), 0) : at;
    const to = { ArrowRight: from + 7, ArrowLeft: from - 7, ArrowDown: from + 1, ArrowUp: from - 1, PageDown: month(from, 1), PageUp: month(from, -1), Home: 0, End: cells.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    show(Math.min(Math.max(to, 0), cells.length - 1), true);
  };
};
