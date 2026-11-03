// A grid of cells, one per x and y, coloured by a value in steps: hours across, days or
// nights down. Returns Plot options without a style, so the same chart draws at build time
// (renderPlot) or in the browser (Plot.plot with the page's style).
//
// Cells are long: one object per cell, with its x, its y and its value. A cell with no value
// is left out (Plot draws nothing for it), so its place stays empty rather than looking like
// the lowest step. The rows
// set the height, so a chart with more rows is taller instead of more cramped.

import * as Plot from '@observablehq/plot';
import { sequential, tipStyle } from './theme.mjs';

// How tall a heatmap of this many rows is, for a page that holds the space before it draws.
export const heatmapHeight = (rows, rowHeight = 30) => rows * rowHeight + 44;

export const heatmap = (
  {
    cells,
    x,
    y,
    value,
    // Every x and y in order, including any with no cells.
    xDomain,
    yDomain,
    // Where each colour step starts: one fewer than the colours.
    steps,
    colors = sequential,
    rowHeight = 30,
    // The tooltip's text per cell.
    title,
    // The labels on each axis. xTick gets (value, index, width).
    xTick = (v) => v,
    yTick = (v) => v,
    marginLeft = 56,
  },
  width,
) => ({
  width,
  height: heatmapHeight(yDomain.length, rowHeight),
  marginLeft,
  marginRight: 0,
  marginTop: 8,
  marginBottom: 30,
  padding: 0.06,
  x: { domain: xDomain, label: null, tickSize: 0, tickFormat: (v, i) => xTick(v, i, width) },
  y: { domain: yDomain, label: null, tickSize: 0, tickFormat: yTick },
  color: { type: 'threshold', domain: steps, range: colors },
  marks: [Plot.cell(cells, { x, y, fill: value, tip: tipStyle, title, className: 'enter-cell' })],
});
