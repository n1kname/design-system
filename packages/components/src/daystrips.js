// Fills a DayStrips after the page has loaded, for data that arrives at runtime.
//
// One strip per stream, one place per day from `from`, coloured by that day's state. HTML, not
// a chart library, because a strip is runs of colour and nothing else.
//
// `states` says how each state looks: { label, mark, color, gap }. `mark` is a Legend mark:
// fill, stripes, or empty (not drawn on the strip, only in the tooltip and the legend). A `gap`
// state is drawn on top of the rest and never thinner than MIN_GAP_PX, so a one-day gap is
// never missed, and solid when too narrow for its stripes. The colours are best the record
// state tokens, --c-state-complete, -waiting, -set-aside and -missing. Each stream is { label, title?, days, summary }: `days` its state per day,
// `summary` what a screen reader hears for its strip. Hovering shows the date and every
// stream whose state that day is not `quiet`.
import { esc } from './datatable.js';

// A one-day gap is about a pixel wide at a few years' scale; never draw one thinner than this.
const MIN_GAP_PX = 4;
// Below this, stripes are noise: the gap is drawn solid in its colour instead.
const MIN_STRIPES_PX = 8;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const runs = (days) => {
  const out = [];
  days.forEach((state, i) => {
    const last = out[out.length - 1];
    if (last && last.state === state) last.len++;
    else out.push({ state, from: i, len: 1 });
  });
  return out;
};

export const setDayStrips = (box, { from, streams, states, quiet, quietText, date = (iso) => iso, month = (m) => MONTHS[m - 1] }) => {
  const days = Math.max(...streams.map((s) => s.days.length));
  const pct = (i) => `${(i / days) * 100}%`;
  const swatch = (state) => (states[state].color ? ` style="--mark: ${states[state].color}"` : '');

  const rows = streams
    .map((s) => {
      const list = runs(s.days).filter((x) => states[x.state].mark !== 'empty');
      // Quiet states first, gaps on top.
      const order = [...list.filter((x) => !states[x.state].gap), ...list.filter((x) => states[x.state].gap)];
      const first = list[0];
      const last = list[list.length - 1];
      const bar = (x) => {
        const { gap, mark, color } = states[x.state];
        const cls = [gap && 'gap', x === first && 'start', x === last && 'end'].filter(Boolean).join(' ');
        const style = `left: ${pct(x.from)}; width: ${pct(x.len)}${gap ? `; min-width: ${MIN_GAP_PX}px` : ''}${color ? `; --mark: ${color}` : ''}`;
        return `<i${cls ? ` class="${cls}"` : ''} data-mark="${mark}" style="${style}"></i>`;
      };
      return `<div class="strip" role="img" aria-label="${esc(s.summary)}">${order.map(bar).join('')}</div>`;
    })
    .join('');

  // A tick at the first of each quarter, the year at each January. Quarters on a wide strip,
  // half years on a phone, and none in the last few percent, where its label has no room.
  const ticks = [];
  for (let i = 0; i < days; i++) {
    const [y, m, d] = addDays(from, i).split('-').map(Number);
    if (d === 1 && (m - 1) % 3 === 0 && i / days < 0.96) {
      const cls = [m === 1 ? 'year' : '', (m - 1) % 6 === 0 ? '' : 'wide-only'].filter(Boolean).join(' ');
      ticks.push(`<span class="${cls}" style="left: ${pct(i)}">${m === 1 ? y : month(m)}</span>`);
    }
  }

  box.innerHTML =
    `<div class="names">${streams.map((s) => `<div${s.title ? ` title="${esc(s.title)}"` : ''}>${esc(s.label)}</div>`).join('')}</div>` +
    `<div class="area"><div class="rows">${rows}</div><div class="ticks" aria-hidden="true">${ticks.join('')}</div>` +
    '<div class="cursor" hidden></div><div class="tip" hidden></div></div>';

  // A gap too narrow for its stripes is drawn solid; how narrow depends on the width the strip has.
  const gaps = [...box.querySelectorAll('.strip .gap')];
  const fit = () => gaps.forEach((g) => g.classList.toggle('narrow', g.getBoundingClientRect().width < MIN_STRIPES_PX));
  fit();
  box.stripsObserver?.disconnect();
  box.stripsObserver = new ResizeObserver(fit);
  box.stripsObserver.observe(box);

  // Hover for the date, and what was not quiet that day.
  const area = box.querySelector('.area');
  const cursor = box.querySelector('.cursor');
  const tip = box.querySelector('.tip');
  area.addEventListener('pointermove', (e) => {
    const r = area.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * days);
    if (i < 0 || i >= days) return;
    const notable = streams.filter((s) => s.days[i] !== quiet);
    cursor.style.left = pct(i + 0.5);
    tip.innerHTML =
      `<strong>${esc(date(addDays(from, i)))}</strong>` +
      (notable.length
        ? notable
            .map((s) => `<span class="line"><i data-mark="${states[s.days[i]].mark}"${swatch(s.days[i])}></i>${esc(s.label)}<em>${esc(states[s.days[i]].label)}</em></span>`)
            .join('')
        : `<span class="quiet">${esc(quietText)}</span>`);
    const right = i / days > 0.6;
    tip.style.left = right ? 'auto' : pct(i);
    tip.style.right = right ? pct(days - i) : 'auto';
    cursor.hidden = tip.hidden = false;
  });
  area.addEventListener('pointerleave', () => {
    cursor.hidden = tip.hidden = true;
  });
};
