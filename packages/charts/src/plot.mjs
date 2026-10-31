// Observable Plot rendered at build time to a plain SVG string. No Plot code
// reaches the browser, so a page ships no chart JavaScript and its data stays in
// that page's HTML. Pinned: Plot is pre-1.0.

import * as Plot from '@observablehq/plot';
import { parseHTML } from 'linkedom';
import { chrome } from './theme.mjs';

export { Plot };

const { document } = parseHTML('<!doctype html><html><body></body></html>');

// The caller's wrapper speaks for the chart (role="img" with a label), so the SVG
// is hidden from screen readers and Plot's labels on its inner parts are dropped.
export const renderPlot = (options) => {
  const node = Plot.plot({
    document,
    style: {
      background: 'transparent',
      color: chrome.textMuted,
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      overflow: 'visible',
    },
    ...options,
  });
  node.setAttribute('aria-hidden', 'true');
  return node.outerHTML.replace(/(<(?!svg)[a-z]+[^>]*?) aria-label="[^"]*"/g, '$1');
};

// Hairline, solid, one step off the surface. Never dashed.
export const grid = (axis = 'y') =>
  (axis === 'y' ? Plot.gridY : Plot.gridX)({ stroke: chrome.grid, strokeOpacity: 1 });

// Text inside an SVG shrinks with it, so one drawing is unreadable on a phone. This
// draws the chart twice, each sized for its column, and CSS shows one. `build` takes
// the width and whether it is the narrow drawing, and returns Plot options.
export const WIDE = 720;
export const NARROW = 320;

export const renderResponsive = (build) => ({
  wide: renderPlot({ width: WIDE, ...build(WIDE, false) }),
  narrow: renderPlot({ width: NARROW, ...build(NARROW, true) }),
});
