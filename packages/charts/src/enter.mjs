// A chart arrives once, as it first comes into view: bars grow from the zero line, left to
// right; lines draw from the first point, and their dots appear as the line reaches them; heatmap
// cells fill in column by column; the words come last. Never again on a resize or a redraw, and
// not at all under reduced motion.
//
// Browser only. The chart builders tag their marks (`enter-bar`, `enter-line`, `enter-dot`,
// `enter-cell`, `enter-fade`), so this works on a chart drawn at build time as well as one drawn
// in the page. Nothing is hidden until the motion is set up, so a chart without script is simply
// there. Runs on the Web Animations API, so a mark keeps its own transform and the page needs no
// stylesheet for it.

import { ms } from './update.mjs';

// Bars grow and lines draw over the tokens' grow and draw, read as a chart arrives, so a site
// that tunes them is followed.
const BAR = () => ms('--motion-grow', 700);
const LINE = () => ms('--motion-draw', 1000);
const CELL = 420;
const SWEEP = 420; // the longest a left-to-right stagger may take

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// The spring from the tokens, or ease-out where the page has an older token set.
const spring = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)';
// A line draws at a hand's pace: easing in a little and out a little, so its dots keep up.
const DRAW = 'cubic-bezier(0.3, 0, 0.2, 1)';
const OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const num = (el, name) => parseFloat(el.getAttribute(name)) || 0;

// Where an SVG element sits across, for the left-to-right order.
const across = (el) => {
  const box = el.getBBox();
  return box.x + box.width / 2;
};

// The zero line, in the drawing's own units: Plot's rule at 0 when there is one, otherwise the
// bottom of the lowest bar.
const zeroOf = (svg, bars) => {
  const rule = svg.querySelector('.enter-zero line');
  if (rule) {
    const shift = /translate\([^,]+,\s*([-\d.]+)\)/.exec(rule.parentNode.getAttribute('transform') ?? '');
    return num(rule, 'y1') + (shift ? parseFloat(shift[1]) : 0);
  }
  return Math.max(...bars.map((b) => {
    const box = b.getBBox();
    return box.y + box.height;
  }));
};

// Spread a set of marks over the sweep by where they sit across.
const sweep = (marks, total = SWEEP) => {
  if (!marks.length) return () => 0;
  const xs = marks.map(across);
  const min = Math.min(...xs);
  const span = Math.max(...xs) - min || 1;
  return (i) => ((xs[i] - min) / span) * total;
};

const svgParts = (svg) => {
  const parts = [];
  // A bar with only its top corners rounded is a path, the rest are rects.
  const rects = [...svg.querySelectorAll('.enter-bar :is(rect, path)')];
  if (rects.length) {
    const zero = zeroOf(svg, rects);
    const at = sweep(rects);
    rects.forEach((rect, i) => {
      rect.style.transformBox = 'view-box';
      rect.style.transformOrigin = `0 ${zero}px`;
      parts.push([rect, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: BAR(), delay: at(i), easing: spring() }]);
    });
  }
  svg.querySelectorAll('.enter-line path').forEach((path) => {
    path.setAttribute('pathLength', '1');
    parts.push([path, [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: LINE(), easing: DRAW }]);
  });
  // A dot fades in, from nearly its size, as its line reaches it; the line covers the width in LINE.
  const dots = [...svg.querySelectorAll('.enter-dot circle')];
  const dotAt = sweep(dots, LINE() * 0.8);
  dots.forEach((dot, i) => {
    dot.style.transformBox = 'fill-box';
    dot.style.transformOrigin = 'center';
    parts.push([dot, [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 280, delay: dotAt(i), easing: OUT }]);
  });
  const cells = [...svg.querySelectorAll('.enter-cell rect')];
  const cellAt = sweep(cells, 500);
  cells.forEach((cell, i) => parts.push([cell, [{ opacity: 0 }, { opacity: 1 }], { duration: CELL, delay: cellAt(i), easing: OUT }]));
  // Words and shading land once the marks they belong to have.
  const last = rects.length ? BAR() + SWEEP * 0.6 : parts.length ? LINE() * 0.7 : 0;
  svg.querySelectorAll('.enter-fade').forEach((g) => parts.push([g, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: last, easing: OUT }]));
  return parts;
};

// Ranked bars are HTML: each bar grows from the left, top to bottom.
const htmlParts = (root) =>
  [...root.querySelectorAll('.ranked-bars i')].flatMap((bar, i, all) => [
    [bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: BAR(), delay: (i / Math.max(all.length - 1, 1)) * SWEEP * 0.6, easing: spring() }],
    [bar.nextElementSibling, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: BAR() * 0.6 + (i / Math.max(all.length - 1, 1)) * SWEEP * 0.6, easing: OUT }],
  ]).filter(([el]) => el);

/**
 * Sets a chart up to arrive. `el` is the chart's SVG, or an element holding ranked bars. Call it
 * once, on the first drawing only. The marks wait at their first frame until the chart is a
 * little way into view, then play.
 */
export const enter = (el) => {
  if (!el || reduced() || typeof el.animate !== 'function') return;
  // A drawing that isn't shown, such as the narrow one of a pair on a wide screen, stays as it is.
  if (!el.getClientRects().length) return;
  const parts = el instanceof SVGSVGElement ? svgParts(el) : htmlParts(el);
  if (!parts.length) return;
  const animations = parts.map(([node, frames, timing]) => {
    if (node.style.transformOrigin === '' && frames[0].transform?.startsWith('scaleX')) node.style.transformOrigin = 'left center';
    const a = node.animate(frames, { ...timing, fill: 'backwards' });
    a.pause();
    return a;
  });
  const play = () => animations.forEach((a) => a.play());
  const box = el.getBoundingClientRect();
  if (box.top < innerHeight * 0.9 && box.bottom > 0) return play();
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      play();
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  io.observe(el);
};

/** Every chart under `selector` that is in the page now, for charts drawn at build time. */
export const enterAll = (selector) =>
  document.querySelectorAll(selector).forEach((root) => {
    const svgs = root.querySelectorAll('svg');
    if (root.querySelector('.ranked-bars i') || root.matches('.ranked-bars')) enter(root);
    svgs.forEach((svg) => enter(svg));
  });
