// A chart drawn in the page at the width its box has, and again when that width changes, so its
// text keeps its real size. The box speaks for the chart (role="img" and a label), so the SVG is
// hidden and Plot's own labels on its parts move to data-mark, where checks find them and screen
// readers don't. It arrives once (enter), and changes in place when drawn again with new figures
// on a page that asks for it (data-chart-motion="update" on an ancestor). `after` runs after every
// drawing, such as attaching the pointer, which a new SVG needs again.
//
//     import { drawn } from '@n1kname/charts/drawn';
//     drawn(box, (width) => Plot.plot({ style, ...bars({ ...spec, pointer: false }, width) }), {
//       key: (m) => m.slice(5, 7),
//       after: () => pointer(box, { rows, x: 'month', series, format }),
//     });
import { enter } from './enter.mjs';
import { snapshot, update } from './update.mjs';

const boxes = new WeakMap();

export const drawn = (box, plot, { key, after } = {}) => {
  const known = boxes.get(box);
  const state = known ?? { width: box.clientWidth };
  state.plot = plot;
  state.after = after;
  const render = () => {
    const svg = state.plot(box.clientWidth);
    svg.setAttribute('aria-hidden', 'true');
    svg.querySelectorAll('[aria-label]').forEach((n) => {
      n.dataset.mark = n.getAttribute('aria-label');
      n.removeAttribute('aria-label');
    });
    box.replaceChildren(svg);
    state.after?.();
    return svg;
  };
  const moves = known && box.closest('[data-chart-motion="update"]');
  const before = moves ? snapshot(box.querySelector('svg'), state.key) : null;
  state.key = key;
  const svg = render();
  if (known) {
    if (moves) update(before, svg, key);
    return;
  }
  boxes.set(box, state);
  if (svg.querySelector('[class^="enter-"]')) enter(svg);
  new ResizeObserver(() => {
    if (box.clientWidth !== state.width) {
      state.width = box.clientWidth;
      render();
    }
  }).observe(box);
};
