// A chart changing in place when its figures change, such as a new year in a filter. `enter`
// plays once, the first time a chart is drawn; this plays on every redraw with new figures after
// that, and never on a resize.
//
// Each bar is known by what it stands for: its series and its place on the x axis, through a key
// the page gives (by default the x value itself). A year's January and the next year's January
// share a key when the page keys months by their month of the year, so stepping through years
// moves each month's bar from its old height to its new one on the spring, and the eye follows
// what grew and what shrank. A bar with no match grows from the zero line, as on arrival, so
// months that are not the same are never shown turning into each other. The axis words fade in.
// Nothing moves under reduced motion.
//
// Browser only, on the Web Animations API, for bars made by `bars` and drawn with Plot in the
// page (the bars must be the plot's own `svg`, which knows its x scale).
//
//     const before = snapshot(box.querySelector('svg'), key);
//     box.replaceChildren(svg);
//     update(before, svg, key);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// A motion token in milliseconds. The tokens are written in seconds (".34s"), so they are read
// with their unit.
export const ms = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
};
const ease = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

// Each bar with the x value it stands for, found from where it sits on the band scale.
const keyed = (svg, key = String) => {
  const scale = svg.scale?.('x');
  const domain = scale?.domain ?? [];
  const half = (scale?.bandwidth ?? 0) / 2;
  const centres = domain.map((d) => scale.apply(d) + half);
  const out = new Map();
  svg.querySelectorAll('.enter-bar').forEach((g, series) =>
    [...g.children].forEach((el) => {
      const b = el.getBBox();
      const mid = b.x + b.width / 2;
      let at = -1;
      let best = Infinity;
      centres.forEach((c, i) => {
        const d = Math.abs(c - mid);
        if (d < best) [best, at] = [d, i];
      });
      const x = at < 0 ? `#${out.size}` : key(domain[at]);
      out.set(`${series}|${x}`, { el, box: b });
    }),
  );
  return out;
};

// Where each bar is, before the chart is replaced.
export const snapshot = (svg, key) => (svg ? keyed(svg, key) : null);

export const update = (before, svg, key) => {
  if (!before || reduced()) return;
  const spring = { duration: ms('--motion-spring', 340), easing: ease('--ease-spring', 'ease-out') };
  const base = { duration: ms('--motion-base', 180), easing: ease('--ease-out', 'ease-out') };
  const after = keyed(svg, key);
  if (!after.size) {
    svg.animate([{ opacity: 0 }, { opacity: 1 }], base);
    return;
  }
  const zero = Math.max(...[...after.values()].map(({ box }) => box.y + box.height));
  for (const [k, { el, box }] of after) {
    if (box.height < 0.5 || box.width < 0.5) continue;
    const old = before.get(k)?.box;
    if (old) {
      // From the old box to the new one: scaled about the new top left, then moved there.
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = '0 0';
      const from = `translate(${old.x - box.x}px, ${old.y - box.y}px) scale(${old.width / box.width}, ${old.height / box.height})`;
      el.animate([{ transform: from }, { transform: 'none' }], spring);
    } else {
      el.style.transformBox = 'view-box';
      el.style.transformOrigin = `0 ${zero}px`;
      el.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], spring);
    }
  }
  svg.querySelectorAll('[data-mark$="tick label"], [data-mark$="grid"]').forEach((n) => n.animate([{ opacity: 0 }, { opacity: 1 }], base));
};

// A figure that changes settles in place: it fades up from a little below, never counts.
export const settle = (el) => {
  if (reduced()) return;
  el.animate([{ opacity: 0.2, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], {
    duration: ms('--motion-base', 180),
    easing: ease('--ease-out', 'ease-out'),
  });
};
