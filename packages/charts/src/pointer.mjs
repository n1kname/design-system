// What a chart says under the pointer: a small card in the page's own type, by the bar or point,
// with the step's name and each series' figure, and a focus on what is pointed at. Browser only,
// for charts drawn in the page with Plot (the chart's `svg` must know its scales) and for the
// donut ring. Styles in ./pointer.css.
//
// Why not Plot's tip: its text is plain and set in SVG, where Safari misplaces a web font, so it
// was set in a system mono; it can't carry a swatch, and it can't move. Here the card is HTML.
//
// - Bars: the other bars dim to 55% (`focus: 'dim'`, the default), or a rule runs through the bar in
//   front with a dot on its top (`'rule'`), or both. Nothing is drawn behind the bars.
// - Lines: a rule through the step and a dot on the line, in front.
// - The card sits above a bar, centred; beside a bar too tall for that, and beside a point, on the
//   side with room, so it never covers what it describes.
// - Motion: the card, rule and dot glide from step to step on the spring; the figures change at
//   once, so reading is never delayed. It fades in fast and out a moment after the pointer leaves,
//   so crossing a gap doesn't blink. Nothing moves under reduced motion.
// - Keyboard: the chart takes focus; the arrow keys step, Home and End go to the ends, Escape
//   lets go. Each step is said in a polite live region beside the chart.
//
// It is a reading aid, not the record: every figure also needs a table.
//
//     import { bars } from '@n1kname/charts/bars';
//     import { pointer } from '@n1kname/charts/pointer';
//     import '@n1kname/charts/pointer.css';
//
//     box.replaceChildren(Plot.plot({ ...bars({ ...spec, pointer: false }, width) }));
//     pointer(box, { rows, x: 'month', series, format: (v) => `${v} h`, label: (r) => r.month });

const el = (tag, cls, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  parent?.append(n);
  return n;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const has = (r, key) => typeof r[key] === 'number';

// The live region, beside the box rather than in it: a box that speaks for its chart with
// role="img" has no children a screen reader reads.
const voice = (box) => {
  if (box.nextElementSibling?.classList.contains('chart-pointer-live')) return box.nextElementSibling;
  const live = document.createElement('p');
  live.className = 'chart-pointer-live';
  live.setAttribute('aria-live', 'polite');
  box.after(live);
  return live;
};

// A layer over the chart for the card and the focus marks. Fresh each time: a chart drawn again
// replaces its svg and calls this again.
const layer = (box) => {
  box.classList.add('chart-pointer-host');
  box.querySelector(':scope > .chart-pointer')?.remove();
  const l = el('div', 'chart-pointer', box);
  l.setAttribute('aria-hidden', 'true');
  return l;
};

// The card's words: the step's name, then one figure, or a row per series with its swatch. Then
// any extra: a [label, value] pair is a row without a swatch, under a hairline, such as a total;
// text is a quiet line at the foot, such as the unit.
const words = (title, items, extra = []) => {
  const pairs = extra.filter(Array.isArray);
  const notes = extra.filter((e) => !Array.isArray(e));
  const one = items.length === 1 && !items[0].swatch;
  const rows = [
    ...(one ? [] : items.map((i) => `<div><dt><i style="background:${i.color}"></i>${esc(i.label)}</dt><dd>${esc(i.value)}</dd></div>`)),
    ...pairs.map(([label, value]) => `<div class="is-extra"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`),
  ];
  return (
    `<p class="chart-pointer-title">${esc(title)}</p>` +
    (one ? `<p class="chart-pointer-one">${esc(items[0].value)}</p>` : '') +
    (rows.length ? `<dl>${rows.join('')}</dl>` : '') +
    notes.map((n) => `<p class="chart-pointer-note">${esc(n)}</p>`).join('')
  );
};

// The same words, said: for the live region, from the keyboard.
const said = (title, items, extra = []) =>
  `${title}: ${[
    ...items.map((t) => (items.length > 1 ? `${t.label} ${t.value}` : t.value)),
    ...extra.map((e) => (Array.isArray(e) ? e.join(' ') : e)),
  ].join(', ')}`;

// Appearing, moving, leaving. The first showing is in place, and so is every step from the keys:
// a key press is one deliberate move, and a glide would make it wait. Pointer moves glide.
// The class is read once before it comes off, so a glide already started lands at once.
const presence = (l, onLeave) => {
  let hide;
  return {
    show(fromKeys = false) {
      clearTimeout(hide);
      const first = !l.classList.contains('is-on');
      const jump = first || fromKeys;
      l.classList.toggle('is-jump', jump);
      l.classList.add('is-on');
      if (jump) {
        void l.offsetWidth;
        requestAnimationFrame(() => l.classList.remove('is-jump'));
      }
      return first;
    },
    leave() {
      clearTimeout(hide);
      hide = setTimeout(() => {
        l.classList.remove('is-on');
        onLeave?.();
      }, 120);
    },
  };
};

// Arrow keys, Home, End and Escape on a focusable box, over `count` steps.
const keys = (box, count, at, go, leave) => {
  box.tabIndex = 0;
  box.onkeydown = (e) => {
    if (e.key === 'Escape') return leave();
    const now = at();
    const to = { ArrowRight: now + 1, ArrowDown: now + 1, ArrowLeft: now - 1, ArrowUp: now - 1, Home: 0, End: count - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(now < 0 ? (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? count - 1 : 0) : Math.min(Math.max(to, 0), count - 1));
  };
  box.onblur = leave;
};

// box: the element holding the chart's svg. rows: the rows drawn, one per x. x: the rows' x key.
// series: [{ key, label, color }], as given to bars() or lines(). format: (value, series) → text.
// label: (row) → the step's name. kind: 'bars' or 'lines'. focus (bars): 'dim', 'rule' or 'both'.
// grouped: bars side by side rather than stacked, as with bars({ grouped }).
// extra: (row) → more for the card after the series: [label, value] pairs and lines of text.
// empty: the text for a series with no value at a step, such as '–', so a missing figure is said
// rather than left out, and every row is a step, one without any figure too; by default such a
// series isn't listed, and such a row is passed over.
export const pointer = (box, { rows, x, series, format, label = (r) => String(r[x]), kind = 'bars', focus = 'dim', grouped = false, extra = () => [], empty }) => {
  const steps = rows.map((r, i) => (empty !== undefined || series.some((s) => has(r, s.key)) ? i : -1)).filter((i) => i >= 0);
  // The card lists a stack from the top down, as it is drawn; bars side by side from the left. On lines, as lines() tells it: a
  // silent series (the dashed rest of another line) only where the line it continues has none.
  const listed = kind === 'bars' ? (grouped ? series : [...series].reverse()) : [...series.filter((s) => !s.silent), ...series.filter((s) => s.silent)];
  const told = (r, s) => (kind === 'lines' && s.silent ? s.continues && has(r, s.key) && !has(r, s.continues) : has(r, s.key) || empty !== undefined);
  const l = layer(box);
  const live = voice(box);
  const ruled = kind === 'lines' || focus !== 'dim';
  const dims = kind === 'bars' && focus !== 'rule';
  const rule = ruled ? el('div', 'chart-pointer-rule', l) : null;
  const dot = ruled ? el('div', 'chart-pointer-dot', l) : null;
  if (dot && kind === 'lines' && series.length === 1) dot.style.background = series[0].color;
  const card = el('div', 'chart-pointer-card', l);
  box.classList.toggle('chart-pointer-dims', dims);
  let at = -1;
  const p = presence(l, () => {
    at = -1;
    box.classList.remove('is-dimming');
  });

  const svg = () => box.querySelector('svg');
  // A bar's top: what its positive pieces add up to, or the tallest of bars side by side. A step
  // on lines: its highest value.
  // A step without any figure: null, and the card sits on the baseline.
  const top = (r) => {
    const values = series.filter((k) => has(r, k.key)).map((k) => r[k.key]);
    if (!values.length) return null;
    return kind === 'bars' && !grouped ? values.reduce((s, v) => s + (v > 0 ? v : 0), 0) : Math.max(...values);
  };
  const where = (i) => {
    const s = svg();
    const xs = s.scale('x');
    const ys = s.scale('y');
    const r = s.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const [y0, y1] = [Math.min(...ys.range), Math.max(...ys.range)].map((v) => v + r.top - b.top);
    return {
      cx: r.left - b.left + xs.apply(rows[i][x]) + (xs.bandwidth ?? 0) / 2,
      bw: xs.bandwidth ?? 0,
      y: r.top - b.top + (top(rows[i]) === null ? Math.max(...ys.range) : ys.apply(top(rows[i]))),
      y0,
      y1,
      width: b.width,
    };
  };

  const show = (i, fromKeys) => {
    if (i < 0) return;
    at = i;
    const r = rows[i];
    const items = listed
      .filter((s) => told(r, s))
      .map((s) => ({ label: s.label, color: s.color, value: has(r, s.key) ? format(r[s.key], s) : empty, swatch: series.length > 1 }));
    const more = extra(r) ?? [];
    card.innerHTML = words(label(r), items, more);
    const q = where(i);
    if (ruled) {
      rule.style.transform = `translateX(${q.cx}px)`;
      rule.style.top = `${q.y0}px`;
      rule.style.height = `${q.y1 - q.y0}px`;
      dot.style.transform = `translate(${q.cx}px, ${q.y}px)`;
    }
    if (dims) {
      const left = box.getBoundingClientRect().left;
      for (const m of box.querySelectorAll('svg .enter-bar > *')) {
        const b = m.getBoundingClientRect();
        // Every bar in the step's band: one when stacked, each of a group side by side.
        m.classList.toggle('is-on', Math.abs(b.left + b.width / 2 - left - q.cx) <= Math.max(q.bw, b.width, 2) / 2 + 1);
      }
      box.classList.add('is-dimming');
    }
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const side = (gap) => (q.cx + gap + cw > q.width ? q.cx - gap - cw : q.cx + gap);
    let cx;
    let cy;
    if (kind === 'bars' && q.y - ch - 10 >= 0) {
      cx = Math.min(Math.max(q.cx - cw / 2, 0), q.width - cw);
      cy = q.y - ch - 10;
    } else if (kind === 'bars') {
      cx = side(q.bw / 2 + 8);
      cy = q.y0;
    } else {
      cx = side(14);
      cy = Math.min(Math.max(q.y - ch / 2, 0), q.y1 - ch);
    }
    card.style.transform = `translate(${cx}px, ${cy}px)`;
    p.show(fromKeys);
    if (fromKeys) live.textContent = said(label(r), items, more);
  };

  // The nearest step with a figure, as Plot's pointer picks it.
  const nearest = (clientX) => {
    const s = svg();
    const xs = s.scale('x');
    const left = s.getBoundingClientRect().left;
    let best = -1;
    let gap = Infinity;
    for (const i of steps) {
      const d = Math.abs(left + xs.apply(rows[i][x]) + (xs.bandwidth ?? 0) / 2 - clientX);
      if (d < gap) [best, gap] = [i, d];
    }
    return best;
  };

  box.onpointermove = (e) => show(nearest(e.clientX));
  box.onpointerleave = () => p.leave();
  keys(box, steps.length, () => steps.indexOf(at), (k) => show(steps[k], true), () => p.leave());
};

// A heatmap drawn with heatmap({ pointer: false }): a frame round the cell pointed at, gliding from
// cell to cell, and the card beside it on the side with room. Keyboard: left and right step
// through the cells in reading order, up and down go to the same hour in the row above or below,
// Home and End to the first and last. cells, x, y and value as given to heatmap(); format:
// (value) → text; label: (cell) → its name; extra as for pointer().
export const pointerCells = (box, { cells, x, y, value, format = String, label = (c) => `${c[x]}, ${c[y]}`, extra = () => [] }) => {
  const l = layer(box);
  const live = voice(box);
  const frame = el('div', 'chart-pointer-cell', l);
  const card = el('div', 'chart-pointer-card', l);
  const svg = () => box.querySelector('svg');
  const scales = () => ({ xs: svg().scale('x'), ys: svg().scale('y') });
  // Reading order: row by row, then across.
  const { xs: x0, ys: y0 } = scales();
  const order = cells
    .filter((c) => typeof c[value] === 'number')
    .sort((a, b) => y0.domain.indexOf(a[y]) - y0.domain.indexOf(b[y]) || x0.domain.indexOf(a[x]) - x0.domain.indexOf(b[x]));
  let at = -1;
  const p = presence(l, () => {
    at = -1;
  });
  const place = (c) => {
    const { xs, ys } = scales();
    const r = svg().getBoundingClientRect();
    const b = box.getBoundingClientRect();
    return { left: r.left - b.left + xs.apply(c[x]), top: r.top - b.top + ys.apply(c[y]), w: xs.bandwidth, h: ys.bandwidth, width: b.width };
  };
  const show = (i, fromKeys) => {
    if (i < 0) return;
    at = i;
    const c = order[i];
    const items = [{ value: format(c[value]) }];
    const more = extra(c) ?? [];
    card.innerHTML = words(label(c), items, more);
    const q = place(c);
    frame.style.width = `${q.w}px`;
    frame.style.height = `${q.h}px`;
    frame.style.transform = `translate(${q.left}px, ${q.top}px)`;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const cx = q.left + q.w + 8 + cw > q.width ? q.left - 8 - cw : q.left + q.w + 8;
    card.style.transform = `translate(${cx}px, ${Math.max(q.top + q.h / 2 - ch / 2, 0)}px)`;
    p.show(fromKeys);
    if (fromKeys) live.textContent = said(label(c), items, more);
  };
  const nearest = (e) => {
    const { xs, ys } = scales();
    const r = svg().getBoundingClientRect();
    let best = -1;
    let gap = Infinity;
    order.forEach((c, i) => {
      const d = Math.hypot(r.left + xs.apply(c[x]) + xs.bandwidth / 2 - e.clientX, r.top + ys.apply(c[y]) + ys.bandwidth / 2 - e.clientY);
      if (d < gap) [best, gap] = [i, d];
    });
    return best;
  };
  // The same x in the row `by` rows away, or the nearest x there.
  const vertical = (i, by) => {
    const { xs, ys } = scales();
    const row = ys.domain[ys.domain.indexOf(order[i][y]) + by];
    const there = order.map((c, k) => [c, k]).filter(([c]) => c[y] === row);
    if (!there.length) return i;
    const want = xs.domain.indexOf(order[i][x]);
    return there.reduce((a, b) => (Math.abs(xs.domain.indexOf(b[0][x]) - want) < Math.abs(xs.domain.indexOf(a[0][x]) - want) ? b : a))[1];
  };
  box.onpointermove = (e) => show(nearest(e));
  box.onpointerleave = () => p.leave();
  box.tabIndex = 0;
  box.onkeydown = (e) => {
    if (e.key === 'Escape') return p.leave();
    const from = at < 0 ? 0 : at;
    const to = { ArrowRight: from + 1, ArrowLeft: from - 1, ArrowDown: vertical(from, 1), ArrowUp: vertical(from, -1), Home: 0, End: order.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    show(at < 0 ? 0 : Math.min(Math.max(to, 0), order.length - 1), true);
  };
  box.onblur = () => p.leave();
};

// A donut drawn with donutRing, as in the Donut component: pointing at a slice, or at its row in
// the list beside the ring, dims the other slices and the other rows' swatches (their words keep
// full contrast), and the card sits in the ring's hole,
// over the title, with the slice's name, figure and share. root: the element holding the ring
// (`.ring` or the svg's parent) and the list (`ul`, one item per slice, optional). parts: the
// slices as given to donutRing. format: (value) → text.
export const pointerDonut = (root, { parts, format = String, share = true }) => {
  const ring = root.querySelector('.ring') ?? root.querySelector('svg').parentElement;
  const paths = [...ring.querySelectorAll('svg path')];
  const items = [...(root.querySelector('ul')?.children ?? [])];
  // The card says it now; the browser's own title tooltip would say it twice.
  ring.querySelectorAll('svg title').forEach((t) => t.remove());
  const l = layer(ring);
  const card = el('div', 'chart-pointer-card chart-pointer-centre', l);
  const live = voice(root);
  root.classList.add('chart-pointer-dims');
  const total = parts.reduce((s, d) => s + d.value, 0);
  let at = -1;
  const p = presence(l, () => {
    at = -1;
    root.classList.remove('is-dimming');
  });
  const show = (i, fromKeys) => {
    at = i;
    const d = parts[i];
    const pct = `${Math.round((d.value / total) * 100)}%`;
    const value = d.valueLabel ?? format(d.value);
    card.innerHTML = words(d.label, [{ label: d.label, color: d.color ?? 'var(--c-chart-neutral)', value: share ? `${value} · ${pct}` : value }]);
    paths.forEach((path, k) => path.classList.toggle('is-on', k === i));
    items.forEach((li, k) => li.classList.toggle('is-on', k === i));
    root.classList.add('is-dimming');
    const c = ring.getBoundingClientRect().width / 2;
    card.style.transform = `translate(${c - card.offsetWidth / 2}px, ${c - card.offsetHeight / 2}px)`;
    p.show(fromKeys);
    if (fromKeys) live.textContent = `${d.label}: ${value}${share ? `, ${pct}` : ''}`;
  };
  [...paths, ...items].forEach((n, k) => {
    const i = k % paths.length;
    n.addEventListener('pointerenter', () => show(i));
    n.addEventListener('pointerleave', () => p.leave());
  });
  keys(root, parts.length, () => at, (i) => show(i, true), () => p.leave());
};
