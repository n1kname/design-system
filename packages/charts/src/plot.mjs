// Observable Plot rendered at build time to a plain SVG string. No Plot code
// reaches the browser, so a page ships no chart JavaScript and its data stays in
// that page's HTML. Pinned: Plot is pre-1.0.

import * as Plot from '@observablehq/plot';
import { parseHTML } from 'linkedom';
import { chrome } from './theme.mjs';

export { Plot };

const { document } = parseHTML('<!doctype html><html><body></body></html>');

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
  return node.outerHTML;
};

// Hairline, solid, one step off the surface. Never dashed.
export const grid = (axis = 'y') =>
  (axis === 'y' ? Plot.gridY : Plot.gridX)({ stroke: chrome.grid, strokeOpacity: 1 });
