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

// The card's words: the step's name, then one figure, or a row per series with its swatch.
const words = (title, items) =>
  `<p class="chart-pointer-title">${esc(title)}</p>` +
  (items.length === 1 && !items[0].swatch
    ? `<p class="chart-pointer-one">${esc(items[0].value)}</p>`
    : `<dl>${items.map((i) => `<div><dt><i style="background:${i.color}"></i>${esc(i.label)}</dt><dd>${esc(i.value)}</dd></div>`).join('')}</dl>`);

// Appearing, moving, leaving. The first showing is in place; after that, everything glides.
const presence = (l, onLeave) => {
  let hide;
  return {
    show() {
      clearTimeout(hide);
      const first = !l.classList.contains('is-on');
      l.classList.toggle('is-jump', first);
      l.classList.add('is-on');
      if (first) requestAnimationFrame(() => l.classList.remove('is-jump'));
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
export const pointer = (box, { rows, x, series, format, label = (r) => String(r[x]), kind = 'bars', focus = 'dim' }) => {
  const steps = rows.map((r, i) => (series.some((s) => has(r, s.key)) ? i : -1)).filter((i) => i >= 0);
  // The card lists a stack from the top down, as it is drawn.
  const listed = kind === 'bars' ? [...series].reverse() : series;
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
  // A bar's top: what its positive pieces add up to. A step on lines: its highest value.
  const top = (r) =>
    kind === 'bars'
      ? series.reduce((s, k) => s + (has(r, k.key) && r[k.key] > 0 ? r[k.key] : 0), 0)
      : Math.max(...series.filter((k) => has(r, k.key)).map((k) => r[k.key]));
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
      y: r.top - b.top + ys.apply(top(rows[i])),
      y0,
      y1,
      width: b.width,
    };
  };

  const show = (i, fromKeys) => {
    if (i < 0) return;
    at = i;
    const r = rows[i];
    const items = listed.filter((s) => has(r, s.key)).map((s) => ({ label: s.label, color: s.color, value: format(r[s.key], s), swatch: series.length > 1 }));
    card.innerHTML = words(label(r), items);
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
        m.classList.toggle('is-on', Math.abs(b.left + b.width / 2 - left - q.cx) <= Math.max(b.width, 2) / 2 + 1);
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
    p.show();
    if (fromKeys) live.textContent = `${label(r)}: ${items.map((t) => (items.length > 1 ? `${t.label} ${t.value}` : t.value)).join(', ')}`;
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
    p.show();
    if (fromKeys) live.textContent = `${d.label}: ${value}${share ? `, ${pct}` : ''}`;
  };
  [...paths, ...items].forEach((n, k) => {
    const i = k % paths.length;
    n.addEventListener('pointerenter', () => show(i));
    n.addEventListener('pointerleave', () => p.leave());
  });
  keys(root, parts.length, () => at, (i) => show(i, true), () => p.leave());
};
